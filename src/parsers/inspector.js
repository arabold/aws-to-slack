"use strict";
/**
 * Parser for AWS Inspector notifications.
 * See: https://console.aws.amazon.com/inspector/home
 */

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class InspectorParser {

	_getFindingsUrlForTarget(target) {
		const parsedTarget = /arn:aws:inspector:(.*?):[0-9]+:.*/.exec(target);
		const region = _.get(parsedTarget, "[1]", "invalid");
		return `https://console.aws.amazon.com/inspector/home?region=${region}#/finding`;
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
					value: run,
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
				title = "Assessment run completed";
				color = Slack.COLORS.ok;
				text = _.replace(_.replace(findingsCount, /,/, "\n"), /{|,|}/g, "");
				fields.push({
					title: "Findings",
					value: this._getFindingsUrlForTarget(target),
					short: false
				});
				break;
			case "FINDING_REPORTED":
				title = "Finding reported";
				color = Slack.COLORS.warning;
				text = finding;
				break;
			case "ASSESSMENT_RUN_STATE_CHANGED":
				title = "Assessment run: ";
				switch (newState) {
				case "COMPLETED":
					title += "Completed";
					break;
				case "CREATED":
					title += "Created";
					break;
				case "START_DATA_COLLECTION_PENDING":
					title += "Starting data collection";
					break;
				case "COLLECTING_DATA":
					title += "Collecting data";
					break;
				case "STOP_DATA_COLLECTION_PENDING":
					title += "Stopping data collection";
					break;
				case "DATA_COLLECTED":
					title += "Data collected";
					break;
				case "START_EVALUATING_RULES_PENDING":
					title += "Start evaluating rules";
					break;
				case "EVALUATING_RULES":
					title += "Evaluating rules";
					break;
				default:
					title += newState;
				}
				break;
			case "ENABLE_ASSESSMENT_NOTIFICATIONS":
				// We ignore the notification setup notifications as they are superfluous.
				return BbPromise.resolve(false);
			}

			const slackMessage = {
				attachments: [{
					fallback: text,
					color: color,
					title: title,
					text: text,
					fields: fields,
					ts: Slack.toEpochTime(time)
				}]
			};
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = InspectorParser;
