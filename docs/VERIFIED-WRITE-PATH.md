# Verified write paths

This file exists to record that both write paths to this repository were exercised end to end.

| Path | How | Result |
|---|---|---|
| Git transport | `git push` of `feat/add-tests-and-license` then PR #1 merged | squash `f033354` |
| REST API only | `blob → tree → commit → ref → pull → merge` while `github.com:443` was unreachable | squash `c1f2fc1` |

A third change (this file) was written with a fine-grained personal access token carrying
`Contents: write` and `Pull requests: write`, to confirm the token-based path works too.