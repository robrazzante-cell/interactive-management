# Interactive Management Platform

An open-source implementation of **Interpretive Structural Modeling (ISM)** and **Interactive Management** methodology for collaborative decision-making.

## What is ISM?

Interpretive Structural Modeling (ISM) was developed by **John N. Warfield** in the 1970s as a systematic, computer-assisted approach to dealing with complex issues. ISM uses group judgment to develop a structured model (a directed graph) that portrays the relationships among elements of a complex system. By decomposing a complex problem into a series of pairwise comparisons, ISM makes it possible for a group to construct a clear hierarchical map of how factors relate to one another.

**Interactive Management (IM)** is the broader methodology that encompasses ISM. Developed by Warfield and extended by practitioners such as Benjamin Broome, IM provides a structured facilitation process that guides groups through idea generation, clarification, structuring (via ISM), and interpretation. It has been applied in contexts ranging from tribal governance and community development to organizational strategy and public policy.

## Features

The platform supports the full Interactive Management workflow through seven core modules:

1. **Projects** -- Create and manage multiple ISM projects, each representing a distinct problem or research question.
2. **Workshop Setup** -- Configure workshop parameters including the triggering question, context statement, and session settings.
3. **Participants** -- Manage workshop participants with anonymous access codes for unbiased idea generation and voting.
4. **Idea Generation** -- Facilitate brainstorming sessions where participants submit ideas individually, which are then collected and displayed for group review.
5. **Factor Coding** -- Organize and code raw ideas into distinct factors (elements) that will be structured through the ISM process.
6. **ISM Voting** -- Guide the group through systematic pairwise comparisons of factors, asking "Does factor A significantly influence factor B?" to build the relationship matrix.
7. **Metastructure / Aggregate Analysis** -- Visualize the resulting structural model as an interactive directed graph, showing hierarchical levels, cycles, and driver-dependent relationships. Includes aggregate analysis across multiple workshops.

## Technology Stack

- **Frontend**: Vanilla JavaScript -- no frameworks, no build tools, no bundlers. Just HTML, CSS, and JS files served statically.
- **Backend/Database**: Firebase (Firestore for data, Authentication for admin and participant access, Hosting for deployment).
- **Visualization**: [vis-network.js](https://visjs.github.io/vis-network/docs/network/) for interactive graph rendering of structural models.
- **Analytics**: [Chart.js](https://www.chartjs.org/) for statistical charts and aggregate analysis dashboards.

## Quick Start (Automated)

Clone and run the setup script -- it walks you through everything:

```bash
git clone https://github.com/robrazzante-cell/interactive-management.git
cd interactive-management
bash setup.sh
```

The script will:
1. Install Firebase CLI (if needed)
2. Log you into Firebase with your Google account
3. Create or connect a Firebase project
4. Guide you through enabling Firestore and Authentication
5. Write your Firebase config automatically
6. Deploy to Firebase Hosting

Your platform will be live at `https://your-project-id.web.app` in about 5 minutes.

**Prerequisites:** [Node.js](https://nodejs.org/) (v16+) and a Google account (Firebase free tier).

For step-by-step manual setup, see [SETUP.md](SETUP.md).

## Academic References

- Warfield, J. N. (1974). Developing Interconnection Matrices in Structural Modeling. *IEEE Transactions on Systems, Man, and Cybernetics*, SMC-4(1), 81-87.
- Warfield, J. N. (1976). *Societal Systems: Planning, Policy, and Complexity*. John Wiley & Sons.
- Broome, B. J. (1995). Collective Design of the Future: Structural Analysis of Tribal Vision Statements. *American Indian Quarterly*, 19(2), 205-228.
- Broome, B. J., & Fulbright, L. (1995). A Multi-Stage Influence Model of Barriers to Group Problem Solving. *Small Group Research*, 26(1), 25-55.

## Contributing

Contributions are welcome. This project is released under the MIT License, so you are free to fork, modify, and distribute it.

- **Fork** the repository and create a feature branch.
- **Submit a pull request** with a clear description of your changes.
- **Report issues** via GitHub Issues.

Whether you are a researcher looking to adapt ISM for your domain, a facilitator who wants to customize the workshop flow, or a developer who wants to improve the codebase, your contributions are appreciated.

## License

This project is licensed under the [MIT License](LICENSE).
