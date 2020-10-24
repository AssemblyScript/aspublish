aspublish
=========

Minimalist publishing tool for GitHub and npm. Generates a changelog, makes a GitHub release of it, and publishes the package to npm.

Usage
-----

Set `GITHUB_TOKEN` and `NPM_TOKEN` as environment variables.

To create a release on GitHub and publish the package to npm:

```sh
npx aspublish
```

May also obtain just the next version that will be created, if necessary:

```sh
npx aspublish --version
```

The returned version is empty if no release has been triggered.

Note that npm `postversion` etc. scripts will also run normally, and that the version number in `package.json` is irrelevant (may just be `0.0.0`).

Commit format
-------------

Prefix either the commit subject or body:

Prefix      | Release type | Pre 1.0.0          | Post 1.0.0
------------|--------------|--------------------|---------------
`breaking:` | Major        | `0.1.0` -> `0.2.0` | `1.0.0` -> `2.0.0`
`feat:`     | Minor        | `0.1.0` -> `0.1.1` | `1.0.0` -> `1.1.0`
`fix:`      | Patch        | `0.1.0` -> `0.1.1` | `1.0.0` -> `1.0.1`

Everything else, except a few [abbreviations](./config.js), will not trigger a new version / release.
