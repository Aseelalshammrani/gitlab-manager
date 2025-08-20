
# Gateway Manager API

## Overview

The Gateway Manager API is a Node.js-based service designed to automatically synchronize changes between a Gateway repository and multiple target repositories. It tracks the latest changes (commits) in the Gateway repository and applies those changes to the target repositories by pulling, copying changed files, committing, and pushing updates. Only committed changes in the Gateway repository are reflected in the target repositories.

## Features
- Automatically pulls the latest committed changes from the Gateway repository.
- Synchronizes those changes to multiple target repositories.
- Handles file changes (additions, modifications, deletions).
- Ensures only committed changes are reflected in the target repositories.
- Supports multiple target repositories for synchronization, config`ured dynamically via environment variables.
- **Excludes certain files from synchronization** via environment configuration.
- Cleans up temporary files and repositories after syncing.

## Prerequisites:

1. **Create Your Personal Access Token in GitLab** with the following scopes:
   - `api`: Grants full access to the GitLab API, including all groups and projects.
   - `write_repository`: Allows pushing code to repositories.
   - `read_repository`: Allows reading from repositories.

2. **Set Up Environment Variables**

   In the root directory of your project, create a `.env` file and include the following environment variables:

   ### Required Environment Variables

   ```env
   # GitLab Personal Access Token
   GITLAB_TOKEN=your_personal_access_token_here

   # GitLab API URL (Self-hosted)
   GITLAB_URL=https://gitlab.leandevclan.com/api/v4

   # URL of the Gateway repository to track
   GATEWAY_REPO_URL=https://gitlab.leandevclan.com/path-to-your-gateway-repo.git

   # Branch to track in Gateway and Target Repositories (defaults to 'master' if not provided)
   GATEWAY_BRANCH='master'
   REPO_BRANCH='master'

   # Names of the target repositories to synchronize (comma-separated)
   REPOS_NAMES="DRG,registries-practitioners"

   # URLs of the corresponding target repositories (comma-separated)
   REPOS_URLS="https://gitlab.leandevclan.com/heem-marketplace/gateways-test/drg.git,https://gitlab.leandevclan.com/heem-marketplace/gateways-test/registries_practitioners.git"

   # Files to exclude from synchronization (comma-separated, optional)
   EXCLUDE_FILES=data/accounts.json,data/routes.json,data/swagger.json,package-lock.json,package.json,.gitignore
   ```

   ### Explanation:
   - **`GITLAB_TOKEN`**: Your GitLab personal access token for authentication.
   - **`GITLAB_URL`**: API URL for self-hosted GitLab instances (optional for GitLab.com users).
   - **`GATEWAY_REPO_URL`**: URL of the Gateway repository to track.
   - **`GATEWAY_BRANCH`**: Branch in the Gateway repository to synchronize from (default: `master`).
   - **`REPO_BRANCH`**: Branch in the target repositories to synchronize to (default: `master`).
   - **`REPOS_NAMES`**: Names of the target repositories (comma-separated).
   - **`REPOS_URLS`**: URLs of the target repositories corresponding to the names (comma-separated).
   - **`EXCLUDE_FILES`**: (Optional) Comma-separated list of files to exclude from synchronization.

## Additional Notes:
- The script dynamically handles multiple target repositories as specified in the `REPOS_NAMES` and `REPOS_URLS` variables.
- Ensure that the number of entries in `REPOS_NAMES` matches the number of entries in `REPOS_URLS`.
- Make sure you have appropriate write access to the target repositories, and that your Git authentication is properly set up.
- Ensure that `GATEWAY_BRANCH` and `REPO_BRANCH` exist in their respective repositories. If they do not exist, they will be created automatically, starting from the `master` branch.
- Excluded files specified in `EXCLUDE_FILES` will not be copied or synchronized to the target repositories.