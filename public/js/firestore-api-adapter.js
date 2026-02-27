// Firestore API Adapter - Intercepts /tables/ calls immediately
(function() {
    console.log("🔧 Firestore API Adapter: Initializing...");
    
    const originalFetch = window.fetch;
    
    window.fetch = async function(url, options = {}) {
        if (typeof url === "string") {
            // Strip leading slash so both "tables/..." and "/tables/..." are intercepted
            if (url.startsWith("/tables/")) url = url.substring(1);
            if (url.startsWith("tables/")) {
                console.log("🔄 Intercepted:", url);
                return handleFirestoreRequest(url, options);
            }
        }
        return originalFetch(url, options);
    };
    
    async function handleFirestoreRequest(url, options) {
        var authStart = Date.now();
        while (!window.firebase) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        // Wait for anonymous auth before querying (Firestore rules require auth)
        if (window.firebase.auth && !window.firebase.auth().currentUser) {
            console.log("🔐 Waiting for anonymous auth...");
            await new Promise(function(resolve) {
                var unsubscribe = window.firebase.auth().onAuthStateChanged(function(user) {
                    if (user) { unsubscribe(); resolve(); }
                });
                // Timeout after 10 seconds to avoid hanging (mobile can be slow)
                setTimeout(function() { unsubscribe(); resolve(); }, 10000);
            });
            // If still no auth after waiting, try signing in again (unless on admin pages)
            if (!window.firebase.auth().currentUser) {
                if (window._skipAnonymousAuth) {
                    console.warn("⚠️ Auth timeout after " + (Date.now() - authStart) + "ms — admin page, not falling back to anonymous");
                } else {
                    console.warn("⚠️ Auth timeout after " + (Date.now() - authStart) + "ms — retrying anonymous sign-in...");
                    try {
                        await window.firebase.auth().signInAnonymously();
                        console.log("✅ Anonymous sign-in retry succeeded");
                    } catch (e) {
                        console.error("❌ Anonymous auth retry failed:", e.message);
                    }
                }
            } else {
                console.log("✅ Auth ready in " + (Date.now() - authStart) + "ms");
            }
        }
        
        const method = (options.method || "GET").toUpperCase();
        const urlParts = url.split("tables/")[1];
        const pathSegments = urlParts.split("?")[0].split("/").filter(Boolean);
        // Collection name aliases (Genspark table names → Firestore collection names)
        var COLLECTION_ALIASES = {
            "factors": "coded_themes",
            "ideas": "idea_responses",
            "factor_votes": "ism_votes"
        };
        const collectionName = COLLECTION_ALIASES[pathSegments[0]] || pathSegments[0];
        const docId = pathSegments[1] || null;
        
        var queryString = url.includes("?") ? url.split("?")[1] : "";
        var params = new URLSearchParams(queryString);
        
        console.log("📊 Firestore: " + method + " → " + collectionName + (docId ? "/" + docId : ""), queryString ? queryString : "");
        
        try {
            var db = firebase.firestore();
            
            if (method === "GET") {
                // Single-document fetch: tables/collection/docId
                if (docId) {
                    // Try Firestore document ID first (triggers 'get' rules for security)
                    try {
                        var directDoc = await db.collection(collectionName).doc(docId).get();
                        if (directDoc.exists) {
                            var result2 = Object.assign({ id: directDoc.id }, directDoc.data());
                            console.log("✅ Retrieved single doc from " + collectionName + " by Firestore ID: " + docId);
                            return new Response(JSON.stringify(result2), { status: 200, headers: { "Content-Type": "application/json" }});
                        }
                    } catch (e) {
                        console.log("📋 doc().get() failed for " + collectionName + "/" + docId + ", trying field query...");
                    }
                    // Fall back to matching the app-level "id" field (triggers 'list' rules)
                    var snap = await db.collection(collectionName).where("id", "==", docId).get();
                    if (!snap.empty) {
                        var result = Object.assign({ id: snap.docs[0].id }, snap.docs[0].data());
                        console.log("✅ Retrieved single doc from " + collectionName + " by id field: " + docId);
                        return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json" }});
                    }
                    console.warn("⚠️ Document not found in " + collectionName + ": " + docId);
                    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" }});
                }

                // Collection fetch: tables/collection
                var query = db.collection(collectionName);

                // Reserved params (not field filters)
                var reservedParams = ["search", "limit", "sort", "offset", "startAfter", "_t"];

                if (params.has("search")) {
                    var searchValue = params.get("search");
                    query = query.where("project_id", "==", searchValue);
                    console.log("🔍 Filtering by project_id: " + searchValue);
                }

                // Apply arbitrary field filters from query params
                params.forEach(function(value, key) {
                    if (reservedParams.indexOf(key) === -1) {
                        // Coerce booleans and numbers
                        var coerced = value;
                        if (value === "true") coerced = true;
                        else if (value === "false") coerced = false;
                        else if (value !== "" && !isNaN(Number(value))) coerced = Number(value);
                        query = query.where(key, "==", coerced);
                        console.log("🔍 Filtering by " + key + ": " + coerced);
                    }
                });

                // Apply sort (e.g. sort=-created_at for descending)
                if (params.has("sort")) {
                    var sortVal = params.get("sort");
                    var direction = "asc";
                    if (sortVal.charAt(0) === "-") {
                        direction = "desc";
                        sortVal = sortVal.substring(1);
                    }
                    query = query.orderBy(sortVal, direction);
                    console.log("🔍 Sorting by " + sortVal + " " + direction);
                }

                // Apply limit (default 500 if not specified)
                var limitVal = 500;
                if (params.has("limit")) {
                    limitVal = parseInt(params.get("limit"), 10);
                    if (limitVal > 0) {
                        query = query.limit(limitVal);
                        console.log("🔍 Limiting to " + limitVal);
                    }
                } else {
                    query = query.limit(500);
                    console.warn("⚠️ No limit specified for " + collectionName + " — defaulting to 500");
                }

                // Cursor-based pagination: startAfter a Firestore doc ID
                if (params.has("startAfter")) {
                    var startAfterId = params.get("startAfter");
                    var cursorDoc = await db.collection(collectionName).doc(startAfterId).get();
                    if (cursorDoc.exists) {
                        query = query.startAfter(cursorDoc);
                        console.log("📄 Paginating: startAfter " + startAfterId);
                    } else {
                        console.warn("⚠️ startAfter doc not found: " + startAfterId + " — returning from beginning");
                    }
                }

                var snapshot = await query.get();
                var data = snapshot.docs.map(function(doc) { return Object.assign({ id: doc.id }, doc.data()); });
                var hasMore = data.length >= limitVal;
                var lastDocId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null;
                console.log("✅ Retrieved " + data.length + " documents from " + collectionName + (hasMore ? " (more available)" : " (last page)"));
                return new Response(JSON.stringify({data: data, pagination: {hasMore: hasMore, lastDocId: lastDocId}}), { status: 200, headers: { "Content-Type": "application/json" }});

            } else if (method === "POST") {
                var body = JSON.parse(options.body);
                var docRef = await db.collection(collectionName).add(body);
                console.log("✅ Created document in " + collectionName + ": " + docRef.id);
                return new Response(JSON.stringify(Object.assign({ id: docRef.id }, body)), { status: 201, headers: { "Content-Type": "application/json" }});

            } else if (method === "DELETE") {
                if (docId) {
                    var deleted = false;

                    // Try Firestore document ID first
                    try {
                        var directDelDoc = await db.collection(collectionName).doc(docId).get();
                        if (directDelDoc.exists) {
                            await db.collection(collectionName).doc(docId).delete();
                            console.log("🗑️ Deleted doc from " + collectionName + " by Firestore ID: " + docId);
                            deleted = true;
                            if (collectionName === "projects") {
                                await deleteRelatedData(db, docId);
                                // Also delete project_access doc
                                try { await db.collection("project_access").doc(docId).delete(); } catch(e) {}
                            }
                        }
                    } catch(e) {
                        console.log("📋 Direct delete failed for " + collectionName + "/" + docId + ", trying field query...");
                    }

                    // Fall back to app-level id field
                    if (!deleted) {
                        var snap = await db.collection(collectionName).where("id", "==", docId).get();
                        if (!snap.empty) {
                            var realIds = snap.docs.map(function(doc) { return doc.id; });
                            await chunkedBatchDelete(db, snap.docs);
                            console.log("🗑️ Deleted " + snap.size + " doc(s) from " + collectionName + " (app id: " + docId + ", firestore ids: " + realIds.join(", ") + ")");
                            deleted = true;
                            if (collectionName === "projects") {
                                await deleteRelatedData(db, docId);
                                try { await db.collection("project_access").doc(docId).delete(); } catch(e) {}
                            }
                        }
                    }

                    if (!deleted) {
                        console.warn("⚠️ No document found in " + collectionName + " with id: " + docId);
                    }
                    
                    return new Response(JSON.stringify({ success: true, id: docId }), { status: 200, headers: { "Content-Type": "application/json" }});
                } else {
                    return new Response(JSON.stringify({ error: "No document ID for delete" }), { status: 400, headers: { "Content-Type": "application/json" }});
                }

            } else if (method === "PUT" || method === "PATCH") {
                var body2 = JSON.parse(options.body);
                console.log("📝 PATCH body:", JSON.stringify(body2).substring(0, 200));
                if (docId) {
                    var updated = false;
                    // Try Firestore document ID first
                    try {
                        var patchDoc = await db.collection(collectionName).doc(docId).get();
                        if (patchDoc.exists) {
                            if (method === "PATCH") {
                                await db.collection(collectionName).doc(docId).update(body2);
                            } else {
                                await db.collection(collectionName).doc(docId).set(body2, { merge: true });
                            }
                            console.log("✏️ Updated document " + docId + " in " + collectionName + " (direct)");
                            updated = true;
                        }
                    } catch(e) {
                        console.log("📋 Direct update failed for " + collectionName + "/" + docId + ", trying field query...");
                    }
                    // Fall back to app-level id field
                    if (!updated) {
                        var snap2 = await db.collection(collectionName).where("id", "==", docId).get();
                        if (!snap2.empty) {
                            var realDocId = snap2.docs[0].id;
                            if (method === "PATCH") {
                                await db.collection(collectionName).doc(realDocId).update(body2);
                            } else {
                                await db.collection(collectionName).doc(realDocId).set(body2, { merge: true });
                            }
                            console.log("✏️ Updated document " + realDocId + " in " + collectionName + " (app id: " + docId + ")");
                        } else {
                            await db.collection(collectionName).doc(docId).set(body2, { merge: true });
                            console.log("✏️ Created/updated document " + docId + " in " + collectionName + " (new)");
                        }
                    }
                    return new Response(JSON.stringify(Object.assign({ id: docId }, body2)), { status: 200, headers: { "Content-Type": "application/json" }});
                }
                return new Response(JSON.stringify({ error: "No document ID for update" }), { status: 400, headers: { "Content-Type": "application/json" }});
            }
            
            console.warn("⚠️ Unhandled method: " + method);
            return new Response(JSON.stringify({ error: "Method " + method + " not supported" }), { status: 405, headers: { "Content-Type": "application/json" }});
            
        } catch (error) {
            console.error("❌ Firestore Error:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" }});
        }
    }
    
    // Chunked batch delete — splits into groups of 450 to stay under Firestore's 500-op batch limit
    async function chunkedBatchDelete(db, docs) {
        var CHUNK_SIZE = 450;
        for (var i = 0; i < docs.length; i += CHUNK_SIZE) {
            var chunk = docs.slice(i, i + CHUNK_SIZE);
            var batch = db.batch();
            chunk.forEach(function(doc) { batch.delete(doc.ref); });
            await batch.commit();
        }
    }

    async function deleteRelatedData(db, projectId) {
        var relatedCollections = [
            "participants", "idea_responses", "coded_themes", "ism_votes",
            "email_tracking", "voting_responses", "ism_metastructure",
            "ism_participant_flowcharts", "public_ism_votes", "public_participants"
        ];
        for (var i = 0; i < relatedCollections.length; i++) {
            var col = relatedCollections[i];
            try {
                var snapshot = await db.collection(col).where("project_id", "==", projectId).get();
                if (!snapshot.empty) {
                    await chunkedBatchDelete(db, snapshot.docs);
                    console.log("🗑️ Cascade deleted " + snapshot.size + " docs from " + col + " for project " + projectId);
                }
            } catch (e) {
                console.warn("⚠️ Could not cascade delete from " + col + ": " + e.message);
            }
        }
    }
    
    console.log("✅ Firestore API Adapter: Ready!");
})();
