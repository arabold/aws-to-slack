"use strict";
/**
 * Parser for AWS Inspector notifications.
 * See: https://console.aws.amazon.com/inspector/home
 */

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

/**
 * Mapping of rule arns to readable text.
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

class InspectorParser {

	_getUrlForRun(kind, runArn) {
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

	_formatFinding(finding) {
		const [ arn, val=0 ] = _.split(_.trim(finding), "=");
		const ruleName = _.findKey(ruleMappings, arns => _.includes(arns, arn)) || arn;

		return `${ruleName}: ${val}`;
	}

	parse(event) {
		return BbPromise.try(() => JSON.parse(_.get(event, "Records[0].Sns.Message", "{}")))
		.catch(_.noop) // ignore JSON errors
		.then(message => {
			const template = _.get(message, "template", "");
			if (!_.startsWith(template, "arn:aws:inspector")) {
				// Not of interest for us
				return BbPromise.resolve(false);
			}

			const time = new Date(_.get(message, "time"));
			const target = _.get(message, "target", "");
			const newState = _.get(message, "newstate", "");
			const run = _.get(message, "run", "");
			const findingsCount = _.get(message, "findingsCount", "");
			const finding = _.get(message, "finding", "");
			const inspectorEvent = _.get(message, "event", "");

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
					value: "<" + this._getUrlForRun("run", run) + `|${run}>\n`,
					short: false
				});
			}

			// We use a color and text depending on the events
			let color = Slack.COLORS.neutral;
			switch (inspectorEvent) {
			case "ASSESSMENT_RUN_STARTED":
				title = "Assessment run started";
				color = Slack.COLORS.ok;
				break;
			case "ASSESSMENT_RUN_COMPLETED":
				title = "Assessment run summary";
				color = Slack.COLORS.ok;
				text += "*<" + this._getUrlForRun("finding", run) + "|Findings>*\n";
				if (!_.isEmpty(findingsCount)) {
					const parsedFindings = _.split(_.replace(findingsCount, /{|}/g, ""), ",");
					text += _.join(_.map(parsedFindings, parsedFinding => this._formatFinding(parsedFinding)), "\n");
				}
				break;
			case "FINDING_REPORTED":
				title = "Finding reported";
				color = Slack.COLORS.warning;
				text = finding;
				break;
			case "ASSESSMENT_RUN_STATE_CHANGED":
				title = "Assessment run";
				switch (newState) {
				case "COMPLETED":
					text = "Completed";
					break;
				case "CREATED":
					text = "Created";
					break;
				case "START_DATA_COLLECTION_PENDING":
					text = "Starting data collection";
					break;
				case "COLLECTING_DATA":
					text = "Collecting data";
					break;
				case "STOP_DATA_COLLECTION_PENDING":
					text = "Stopping data collection";
					break;
				case "DATA_COLLECTED":
					text = "Data collected";
					break;
				case "START_EVALUATING_RULES_PENDING":
					text = "Start evaluating rules";
					break;
				case "EVALUATING_RULES":
					text = "Evaluating rules";
					break;
				default:
					text = newState;
				}
				break;
			case "ENABLE_ASSESSMENT_NOTIFICATIONS":
				// We ignore the notification setup notifications as they are superfluous.
				return BbPromise.resolve(false);
			}

			const slackMessage = {
				attachments: [{
					author_name: "Amazon Inspector",
					fallback: text,
					color: color,
					title: title,
					text: text,
					fields: fields,
					mrkdwn_in: [ "text" ],
					ts: Slack.toEpochTime(time)
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = InspectorParser;
