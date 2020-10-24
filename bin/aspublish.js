#!/usr/bin/env node
import {
  getLatestVersion,
  getCommitsSince,
  getNextVersion,
  generateReleaseNotes,
  publishPackage,
  publishRelease
} from "../index.js";

function doRelease() {
  var latestVersion = getLatestVersion();
  var nextVersion = null;
  var releaseNotes = null;

  let { kind, commits } = getCommitsSince(latestVersion);
  if (latestVersion) {
    if (kind) {
      nextVersion = getNextVersion(latestVersion, kind);
      releaseNotes = generateReleaseNotes(commits);
    }
  } else {
    nextVersion = "0.1.0";
    releaseNotes = "Initial release";
  }

  if (nextVersion) {
    publishRelease(nextVersion, commits[0], releaseNotes);
    publishPackage(nextVersion);
  }
}

function doVersion() {
  var latestVersion = getLatestVersion();
  var nextVersion = "";

  let { kind } = getCommitsSince(latestVersion);
  if (latestVersion) {
    if (kind) {
      nextVersion = getNextVersion(latestVersion, kind);
    } else {
      nextVersion = "";
    }
  } else {
    nextVersion = "0.1.0";
  }
  console.log(nextVersion);
}

if (process.argv.length < 3) {
  doRelease();
} else if (process.argv[2] == "--version" || process.argv[2] == "-v") {
  doVersion();
} else {
  console.error("Usage: aspublish [--version|-v]");
  process.exit(1);
}
