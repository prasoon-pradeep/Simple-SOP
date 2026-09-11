# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in SOP Builder, please report it privately using GitHub's private vulnerability reporting feature:

1. Go to the [Security tab](https://github.com/prasoon-pradeep/Simple-SOP/security) of this repository
2. Click **Report a vulnerability**
3. Fill in the details of the issue

Do not open a public issue for security vulnerabilities.

## Scope

SOP Builder is an offline-first desktop app. Data is stored locally in a SQLite database; no cloud sync or multi-user features exist. The main areas of security relevance are:

- Local data storage and file handling
- The optional AI enhancement feature, which sends data to a user-configured provider using a user-supplied API key
- The auto-update mechanism

## Supported Versions

Only the latest released version is supported with security fixes.
