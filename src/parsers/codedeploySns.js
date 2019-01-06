"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class CodeDeploySNSParser {

	parse(event) {
		return BbPromise.try(() => JSON.parse(_.get(event, "Records[0].Sns.Message", "{}")))
			.catch(_.noop) // ignore JSON errors
			.then(message => {
				if (!_.has(message, "deploymentId") || !_.has(message, "deploymentGroupName")) {
					return BbPromise.resolve(false);
				}

				const time = new Date(_.get(event, "Records[0].Sns.Timestamp"));
				const deployStatus = _.get(message, "status");
				const deploymentGroup = _.get(message, "deploymentGroupName");
				const deploymentId = _.get(message, "deploymentId");
				const app = _.get(message, "applicationName");
				const statusUrl = `https://console.aws.amazon.com/codedeploy/home?region=${message.region}#/deployments/${deploymentId}`;
				const fields = [];

				let color = Slack.COLORS.neutral;
				const baseTitle = `CodeDeploy Application ${app}`;
				let title = baseTitle;
				if (deployStatus === "SUCCEEDED") {
					title = `<${statusUrl}|${baseTitle}> has finished`;
					color = Slack.COLORS.ok;
				}
				else if (deployStatus === "STOPPED") {
					title = `<${statusUrl}|${baseTitle}> was stopped`;
					color = Slack.COLORS.warning;
				}
				else if (deployStatus === "FAILED") {
					title = `<${statusUrl}|${baseTitle}> has failed`;
					color = Slack.COLORS.critical;
				}
				else if (deployStatus === "CREATED") {
					title = `<${statusUrl}|${baseTitle}> has started deploying`;
				}

				if (deployStatus) {
					fields.push({
						title: "Status",
						value: deployStatus,
						short: true
					});
				}

				fields.push({
					title: "DeploymentGroup",
					value: `${deploymentGroup}`,
					short: true
				});

				const slackMessage = {
					attachments: [{
						author_name: "AWS CodeDeploy Notification",
						fallback: `${baseTitle} ${deployStatus}`,
						color: color,
						title: title,
						fields: fields,
						mrkdwn_in: [ "title", "text" ],
						ts: Slack.toEpochTime(time)
					}]
				};
				return BbPromise.resolve(slackMessage);
			});
	}
}

module.exports = CodeDeploySNSParser;