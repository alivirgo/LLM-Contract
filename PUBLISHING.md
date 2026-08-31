# Publishing llm-contract

The package is intended to be published publicly as the unscoped npm package
`llm-contract` by the npm user `alivirgo`.

## Secure interactive release

1. Sign in locally. Do not paste an npm token into chat or commit one to the repository.

   ```sh
   npm login
   npm whoami
   ```

   `npm whoami` must print `alivirgo`.

2. Confirm that the name remains available and inspect the exact package contents.

   ```sh
   npm view llm-contract
   npm run verify
   npm pack --dry-run
   ```

   Name availability is indicated by `npm view` returning `E404`. Review the dry-run
   file list before continuing.

3. Publish the public package. npm will request a one-time password when the account
   requires two-factor authentication.

   ```sh
   npm publish --access public
   ```

4. Verify the public release.

   ```sh
   npm view llm-contract name version description dist-tags --json
   npm install llm-contract
   ```

## Later releases

Update the changelog and choose the semantic version change deliberately:

```sh
npm version patch
npm publish --access public
git push --follow-tags
```

Never reuse a published version. Never commit `.npmrc`, access tokens, recovery
codes, or one-time passwords. For automated publishing, use npm trusted publishing
from GitHub Actions instead of a long-lived repository secret where possible.
