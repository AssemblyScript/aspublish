import { spawnSync } from "child_process";
import { request } from "https";
import semver from "semver";
import config from "./config.js";

/** Major version change. */
export const MAJOR = 3;
/** Minor version change. */
export const MINOR = 2;
/** Patch version change. */
export const PATCH = 1;
/** No version change. */
export const OTHER = 0;

/** Executes a command and returns stdout. */
export function exec(cmd, args = [], options = {}) {
  const res = spawnSync(cmd, args, options);
  if (res.status != 0) throw Error(`command '${cmd}' failed with code ${res.status}: ${res.stderr.toString()}`);
  return res.stdout.toString().trim();
}

/** Just runs a command. */
export function run(cmd, args = []) {
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.status != 0) throw Error(`command '${cmd}' failed with code ${res.status}`);
}

/** Gets existing versions sorted from newest to oldest. */
export function getVersions() {
  const lines = exec("git", ["log", "--format=%S %H", "--tags"]).trim().split(/\r?\n/g);
  const versions = [];
  for (const line of lines) {
    let p = line.indexOf(" ");
    if (p == -1) continue;
    var tag = line.substring(0, p).trim();
    var hash = line.substring(p + 1).trim();
    var version;
    try {
      version = semver.coerce(tag.replace(/^v/, "")).version;
    } catch (e) {
      continue;
    }
    versions.push({
      tag,
      hash,
      version
    });
  }
  return versions.sort((a, b) => semver.compare(b.version, a.version));
}

/** Gets the latest version or `null` if there is none yet.*/
export function getLatestVersion() {
  const versions = getVersions();
  if (versions.length) return versions[0];
  return null;
}

/** Generates a pseudo-random string of the specified length. */
function generateId(length = 20) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  var id = "";
  while (id.length < length) {
    id += chars.charAt((Math.random() * chars.length) | 0);
  }
  return id;
}

/** Gets all commits since the specified commit, including release kind triggered. */
export function getCommitsSince(sinceCommit = null) {
  if (sinceCommit) {
    if (typeof sinceCommit !== "string") {
      sinceCommit = sinceCommit.hash;
      if (typeof sinceCommit !== "string") throw Error("commit hash expected");
    }
  }
  const delim = "===" + generateId() + "===";
  const args = ["log", "--format=%H%n%s%n%b" + delim];
  if (sinceCommit) args.push(sinceCommit + "..HEAD");
  const parts = exec("git", args).split(delim);

  function matches(commit, re) {
    var match = re.exec(commit.subject);
    if (match) {
      commit.subject = commit.subject.substring(match[0].length).trim();
      return true;
    }
    match = re.exec(commit.body);
    if (match) {
      commit.body = commit.body.substring(match[0].length).trim();
      return true;
    }
    return false;
  }

  var kind = OTHER;
  const commits = [];
  for (let i = 0, k = parts.length - 1; i < k; ++i) {
    let part = parts[i].trim();
    let pos1 = part.indexOf("\n");
    let hash = part.substring(0, pos1).trimRight();
    let pos2 = part.indexOf("\n", pos1 + 1);
    if (pos2 == -1) pos2 = part.length;
    let subject = part.substring(pos1, pos2).trim();
    let body = part.substring(pos2 + 1).trim();
    let commit = {
      kind: OTHER,
      hash,
      subject,
      body
    };
    for (let re of config.patch) {
      if (matches(commit, re)) {
        commit.kind = PATCH;
        break;
      }
    }
    for (let re of config.minor) {
      if (matches(commit, re)) {
        commit.kind = MINOR;
        break;
      }
    }
    for (let re of config.major) {
      if (matches(commit, re)) {
        commit.kind = MAJOR;
        break;
      }
    }
    if (commit.kind > kind) kind = commit.kind;
    commits.push(commit);
  }
  return {
    kind,
    commits
  };
}

/** Gets the current repository. */
export function getRepo() {
  const url = exec("git", ["config", "--get", "remote.origin.url"]);
  const match = /\/(\w(?:[-_.]?\w)*)\/(\w(?:[-_.]?\w)*)$/.exec(url);
  if (!match) throw Error("invalid repository url: " + url);
  const user = match[1];
  const repo = match[2].replace(/\.git$/, "");
  return `${user}/${repo}`;
}

/** Gets the GitHub token to use. */
export function getGithubToken() {
  const token = process.env.GITHUB_TOKEN || exec("git", ["config", "--global", "github.token"]);
  if (!token) throw Error("missing GITHUB_TOKEN");
  return token;
}

/** Gets the npm token to use. */
export function getNpmToken() {
  const token = process.env.NPM_TOKEN || "";
  if (!token) throw Error("missing NPM_TOKEN");
  return token;
}

/** Generates release notes from the specified commits. */
export function generateReleaseNotes(commits) {
  const categories = [];
  for (let commit of commits) {
    let kind = commit.kind || OTHER;
    let category = categories[kind];
    if (!category) categories[kind] = category = [];
    category.push(commit);
  }
  const sb = [];
  function writeSection(category, title) {
    sb.push(`### ${title}\n\n`);
    for (let { subject, hash, body } of category) {
      sb.push(`* **${subject}** (${hash})\n`);
      if (body.length) {
        body = body.split(/\r?\n/g).join("\n  ");
        sb.push(`  ${body}\n`);
      }
    }
    sb.push("\n");
  }
  if (categories[MAJOR]) writeSection(categories[MAJOR], "Breaking changes");
  if (categories[MINOR]) writeSection(categories[MINOR], "New features");
  if (categories[PATCH]) writeSection(categories[PATCH], "Bug fixes");
  if (categories[OTHER]) writeSection(categories[OTHER], "Other");
  return sb.join("");
}

/** Gets the next version. */
export function getNextVersion(latestVersion, kind) {
  if (typeof latestVersion !== "string") {
    latestVersion = latestVersion.version;
    if (typeof latestVersion != "string") throw Error("version string expected");
  }
  if (typeof kind !== "number") throw Error("release kind expected");
  return semver.inc(latestVersion,
    semver.lt(latestVersion, "1.0.0")
      ? (kind == MAJOR ? "minor" : "patch")
      : (kind == MAJOR ? "major" : kind == MINOR ? "minor" : "patch")
  );
}

/** Creates a release on GitHub. */
export function publishRelease(nextVersion, commit, notes) {
  if (typeof nextVersion != "string") throw Error("version string expected");
  if (typeof commit != "string") {
    commit = commit.hash;
    if (typeof commit != "string") throw Error("commit hash expected");
  }
  if (typeof notes !== "string") throw Error("release notes string expected");
  const repo = getRepo();
  const token = getGithubToken();
  const data = Buffer.from(JSON.stringify({
    tag_name: `v${nextVersion}`,
    target_commitish: commit,
    name: `v${nextVersion}`,
    body: notes,
    draft: false,
    prerelease: false
  }), "utf-8");
  const req = request({
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${repo}/releases?access_token=${token}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": data.length,
      "User-Agent": "aspublish"
    }
  }, res => {
    const chunks = [];
    res.on("error", err => {
      throw err;
    });
    res.on("data", chunk => {
      chunks.push(chunk);
    });
    res.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      if (res.statusCode != 201) throw Error(`failed to create release (status ${res.statusCode}): ${body}`);
    });
  });
  req.on("error", err => {
    throw err;
  });
  req.write(data);
  req.end();
}

/** Publishes the package to npm. */
export function publishPackage(version) {
  const token = getNpmToken();
  run("npm", ["version", version, "--no-git-tag-version"]);
  run("npm", ["config", "set", `//registry.npmjs.org/:_authToken=${token}`]);
  run("npm", ["publish", "--access", "public"]);
}
