//linter error types
// 2.x - dependency issues
PackageLinter = {
  getLintErrors: function (packageModel) {
    return lintRules.reduce(function (allErrs, rule) {
      var ruleErrs = rule(packageModel);
      return allErrs.concat(ruleErrs);
    }, []);
  },
  latestMeteorVersionOfPackage: latestMeteorVersionOfPackage
};

var lintRules = [
    function (packageModel) {
      var code = "2.1",
        severity=1,
        error="External dependencies should declare a version",
        ruleErrs = [];

      for (var p in packageModel.externalDeps.uses) {
        var dep = packageModel.externalDeps.uses[p];
        if (!dep.versionNum) {
          ruleErrs.push({code: code, severity: severity, offender: p, error: error, details: dep})
        }
      }

      return ruleErrs;
    }
  ]
