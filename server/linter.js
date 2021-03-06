//linter error types
// 2.x - dependency issues
var semver = Npm.require('semver');
var latestVersions = {};

PackageLinter = {
  getLintErrors: function (packageModel) {
    /* populate the latestVersions dictionary */
    var latestVersionPromises = _.keys(packageModel.externalDeps.uses).map(function (name) {
        return latestMeteorVersionOfPackage(name).then(function(version){
          latestVersions[name] = version;
        })
    });
    Promise.await(Promise.all(latestVersionPromises));

    var syncErrors = syncLintRules.reduce(function (allErrs, rule) {
      var ruleErrs = rule(packageModel);
      return allErrs.concat(ruleErrs);
    }, []);
    return syncErrors;
  },
  latestMeteorVersionOfPackage: latestMeteorVersionOfPackage
};

var _deprecationMap = {
  "okgrow:iron-router-autoscroll": "okgrow:router-autoscroll",
  "meteorhacks:flow-router": "kadira:flow-router",
  "deanius:promise": "okgrow:promise",
  "urigo:angular": "angular"
};

var syncLintRules = [
  function DepsShouldDeclareVersion (packageModel) {
    var code = "2.1",
      severity=1,
      error="External dependencies should declare a version",
      ruleErrs = [];

    for (var usedPackage in packageModel.externalDeps.uses) {
      var dep = packageModel.externalDeps.uses[usedPackage];
      if (!dep.versionNum) {
        ruleErrs.push({
          code: code,
          severity: severity,
          offender: usedPackage,
          error: error,
          replacements: [
            usedPackage,
            usedPackage + "@" + latestVersions[usedPackage]
          ],
          details: "should depend on " + latestVersions[usedPackage],
          detailsObj: dep})
      }
    }
    return ruleErrs;
  },
  function DepsShouldNotReferToDeprecated (packageModel) {
    var code = "2.2",
      severity=1,
      error="Dependencies should not refer to deprecated versions.",
      ruleErrs = [];

    for (var usedPackage in packageModel.externalDeps.uses) {
      var dep = packageModel.externalDeps.uses[usedPackage];
      var moreBetterName = _deprecationMap[usedPackage];
      if( moreBetterName ){
        //XXX use existing latestVersion dictionary
        var moreBetterVersion = latestVersions[usedPackage];
        ruleErrs.push({
          code: code,
          severity: severity,
          offender: usedPackage,
          error: error,
          replacements: [
            usedPackage + "@" + dep.versionNum,
            moreBetterName + "@" + moreBetterVersion
          ],
          details: usedPackage + "@" + dep.versionNum + " => " + moreBetterName + "@" + moreBetterVersion,
          detailObj: {
            oldName: usedPackage,
            oldVersion: dep.versionNum,
            newName: moreBetterName,
            newVersion: moreBetterVersion
          }})
      }
    }
    return ruleErrs;
  },

  function DepsShouldNotReferToOutdated (packageModel) {
    var code = "2.3",
      severity=2,
      error="Dependencies should not refer to versions outdated by more than a minor version.",
      ruleErrs = [];

    for (var usedPackage in packageModel.externalDeps.uses) {
      var latestVersion = latestVersions[usedPackage];
      var currentVersion = packageModel.externalDeps.uses[usedPackage].versionNum;
      if (!currentVersion) continue;
      var diff = semver.diff(currentVersion, latestVersion); //major, minor, patch
      if (diff === "major" || diff === "minor"){
        ruleErrs.push({
          code: code,
          severity: severity,
          offender: usedPackage,
          error: error,
          replacements: [
            usedPackage + "@" + currentVersion,
            usedPackage + "@" + latestVersion
          ],
          details: currentVersion + " -> " + latestVersion,
          detailObj: {
            latest: latestVersion,
            current: currentVersion,
            diff: diff
          }
        })
      }
    }
    return ruleErrs;
  }

];
