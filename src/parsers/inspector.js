//
// AWS Inspector notification parser
// See: https://console.aws.amazon.com/inspector/home
//
exports.matches = event =>
	_.startsWith(event.message.template, "arn:aws:inspector");

/**
 * Mapping of rule ARNs to readable text.
 * See: https://docs.aws.amazon.com/inspector/latest/userguide/inspector_rules-arns.html
 * The mappings are reversed to optimize extensibility by adding a new region arns.
 */
const ruleMappings = {
	"Common Vulnerabilities and Exposures": [
		"arn:aws:inspector:us-west-2:758058086616:rulespackage/0-9hgA516p",
		"arn:aws:inspector:us-east-1:316112463485:rulespackage/0-gEjTy7T7",
		"arn:aws:inspector:us-west-1:166987590008:rulespackage/0-TKgzoVOa",
		"arn:aws:inspector:ap-south-1:162588757376:rulespackage/0-LqnJE9dO",
		"arn:aws:inspector:ap-southeast-2:454640832652:rulespackage/0-D5TGAxiR",
		"arn:aws:inspector:ap-northeast-2:526946625049:rulespackage/0-PoGHMznc",
		"arn:aws:inspector:ap-northeast-1:406045910587:rulespackage/0-gHP9oWNT",
		"arn:aws:inspector:eu-west-1:357557129151:rulespackage/0-ubA5XvBh",
		"arn:aws:inspector:eu-central-1:537503971621:rulespackage/0-wNqHa8M9",
	],
	"CIS Operating System Security Configuration Benchmarks": [
		"arn:aws:inspector:us-west-2:758058086616:rulespackage/0-H5hpSawc",
		"arn:aws:inspector:us-east-1:316112463485:rulespackage/0-rExsr2X8",
		"arn:aws:inspector:us-west-1:166987590008:rulespackage/0-xUY8iRqX",
		"arn:aws:inspector:ap-south-1:162588757376:rulespackage/0-PSUlX14m",
		"arn:aws:inspector:ap-southeast-2:454640832652:rulespackage/0-Vkd2Vxjq",
		"arn:aws:inspector:ap-northeast-2:526946625049:rulespackage/0-T9srhg1z",
		"arn:aws:inspector:ap-northeast-1:406045910587:rulespackage/0-7WNjqgGu",
		"arn:aws:inspector:eu-west-1:357557129151:rulespackage/0-sJBhCr0F",
		"arn:aws:inspector:eu-central-1:537503971621:rulespackage/0-nZrAVuv8",
	],
	"Security Best Practices": [
		"arn:aws:inspector:us-west-2:758058086616:rulespackage/0-JJOtZiqQ",
		"arn:aws:inspector:us-east-1:316112463485:rulespackage/0-R01qwB5Q",
		"arn:aws:inspector:us-west-1:166987590008:rulespackage/0-byoQRFYm",
		"arn:aws:inspector:ap-south-1:162588757376:rulespackage/0-fs0IZZBj",
		"arn:aws:inspector:ap-southeast-2:454640832652:rulespackage/0-asL6HRgN",
		"arn:aws:inspector:ap-northeast-2:526946625049:rulespackage/0-2WRpmi4n",
		"arn:aws:inspector:ap-northeast-1:406045910587:rulespackage/0-bBUQnxMq",
		"arn:aws:inspector:eu-west-1:357557129151:rulespackage/0-SnojL3Z6",
		"arn:aws:inspector:eu-central-1:537503971621:rulespackage/0-ZujVHEPB",
	],
	"Runtime Behavior Analysis": [
		"arn:aws:inspector:us-west-2:758058086616:rulespackage/0-vg5GGHSD",
		"arn:aws:inspector:us-east-1:316112463485:rulespackage/0-gBONHN9h",
		"arn:aws:inspector:us-west-1:166987590008:rulespackage/0-yeYxlt0x",
		"arn:aws:inspector:ap-south-1:162588757376:rulespackage/0-EhMQZy6C",
		"arn:aws:inspector:ap-southeast-2:454640832652:rulespackage/0-P8Tel2Xj",
		"arn:aws:inspector:ap-northeast-2:526946625049:rulespackage/0-PoYq7lI7",
		"arn:aws:inspector:ap-northeast-1:406045910587:rulespackage/0-knGBhqEu",
		"arn:aws:inspector:eu-west-1:357557129151:rulespackage/0-lLmwe1zd",
		"arn:aws:inspector:eu-central-1:537503971621:rulespackage/0-0GMUM6fg",
	],
};

exports.parse = event => {
	const target = event.get("target", "");
	const newState = event.get("newstate", "");
	const run = event.get("run", "");
	const findingsCount = event.get("findingsCount", "");
	const finding = event.get("finding", "");
	const inspectorEvent = event.get("event", "");

	let title = "";
	let text = "";

	const fields = [{
		title: "Target",
		value: target,
		short: false
	}];
	if (!_.isEmpty(run)) {
		fields.push({
			title: "Run",
			value: "<" + getUrlForRun("run", run) + `|${run}>\n`,
			short: false
		});
	}

	// We use a color and text depending on the events
	let color = event.COLORS.neutral;
	switch (inspectorEvent) {
	case "ASSESSMENT_RUN_STARTED":
		title = "Assessment run started";
		color = event.COLORS.ok;
		break;
	case "ASSESSMENT_RUN_COMPLETED":
		title = "Assessment run summary";
		color = event.COLORS.ok;
		text += "*<" + getUrlForRun("finding", run) + "|Findings>*\n";
		if (!_.isEmpty(findingsCount)) {
			const parsedFindings = _.split(_.replace(findingsCount, /[{}]/g, ""), ",");
			text += _.join(_.map(parsedFindings, parsedFinding => formatFinding(parsedFinding)), "\n");
		}
		break;
	case "FINDING_REPORTED":
		title = "Finding reported";
		color = event.COLORS.warning;
		text = finding;
		break;
	case "ASSESSMENT_RUN_STATE_CHANGED":
		title = "Assessment run";
		text = (() => {
			switch (newState) {
			case "COMPLETED":
				return "Completed";
			case "CREATED":
				return "Created";
			case "START_DATA_COLLECTION_PENDING":
				return "Starting data collection";
			case "COLLECTING_DATA":
				return "Collecting data";
			case "STOP_DATA_COLLECTION_PENDING":
				return "Stopping data collection";
			case "DATA_COLLECTED":
				return "Data collected";
			case "START_EVALUATING_RULES_PENDING":
				return "Start evaluating rules";
			case "EVALUATING_RULES":
				return "Evaluating rules";
			default:
				return newState;
			}
		})();
		break;
	case "ENABLE_ASSESSMENT_NOTIFICATIONS":
		// We ignore the notification setup notifications as they are superfluous.
		return false;
	}

	return event.attachmentWithDefaults({
		author_name: "Amazon Inspector",
		fallback: text,
		color: color,
		title: title,
		text: text,
		fields: fields,
		mrkdwn_in: ["text"],
	});
};

function getUrlForRun(kind, runArn) {
	const parsedRun = /arn:aws:inspector:(.*?):[0-9]+:.*/.exec(runArn);
	const region = _.get(parsedRun, "[1]", "invalid");
	const findingBaseUrl = `https://console.aws.amazon.com/inspector/home?region=${region}#/${kind}`;
	const filter = encodeURIComponent(JSON.stringify({
		assessmentRunArns: [
			runArn
		]
	}));
	return `${findingBaseUrl}?filter=${filter}`;
}

function formatFinding(finding) {
	const [arn, val = 0] = _.split(_.trim(finding), "=");
	const ruleName = _.findKey(ruleMappings, arns => _.includes(arns, arn)) || arn;

	return `${ruleName}: ${val}`;
}
