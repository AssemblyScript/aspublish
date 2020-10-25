aspublish
=========

<a href="https://github.com/AssemblyScript/aspublish/actions?query=workflow%3APublish"><img src="https://img.shields.io/github/workflow/status/AssemblyScript/aspublish/Publish/master?label=publish&logo=github" alt="Publish status" /></a>
<a href="https://www.npmjs.com/package/aspublish"><img src="https://img.shields.io/npm/v/aspublish.svg?label=aspublish&color=007acc&logo=npm" alt="npm version" /></a>

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

Except a few [aliases and abbreviations](./config.js), other prefixes will not trigger a new version / release.

Example
-------

As a step during GitHub Actions:

```yml
- name: Make release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN:  ${{ secrets.NPM_TOKEN }}
  run: |
    VERSION=$(npx aspublish --version)
    if [ -z "$VERSION" ]; then
      echo "Changes do not trigger a release"
    else
      echo "Publishing new version: $VERSION"
      npx aspublish
    fi
```

Or, if obtaining the version upfront is not necessary:

```yml
- name: Make release
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN:  ${{ secrets.NPM_TOKEN }}
  run: npx aspublish
```

See this repository's [publish.yml](.github/workflows/publish.yml) for a complete configuration (replace `node bin/aspublish.js` with `npx aspublish`).
