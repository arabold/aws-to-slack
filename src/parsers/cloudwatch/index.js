"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Chart = require("./chart"),
	Slack = require("../../slack");

class CloudWatchParser {

	parse(event) {
		return BbPromise.try(() => JSON.parse(_.get(event, "Records[0].Sns.Message", "{}")))
		.catch(_.noop) // ignore JSON errors
		.then(message => {
			if (!_.has(message, "AlarmName") || !_.has(message, "AlarmDescription")) {
				// Not of interest for us
				return BbPromise.resolve(false);
			}

			// CloudWatch Alarm
			const accountId = message.AWSAccountId;
			const alarmName = message.AlarmName;
			// const description = message.AlarmDescription;
			const oldState = message.OldStateValue;
			const newState = message.NewStateValue;
			const reason = message.NewStateReason;
			const region = message.Region;
			const time = message.StateChangeTime;

			let color = Slack.COLORS.neutral;
			switch(newState) {
			case "OK":
				color = Slack.COLORS.ok;
				break;
			case "ALARM":
				color = Slack.COLORS.critical;
				break;
			case "INSUFFICIENT_DATA":
				color = Slack.COLORS.warning;
				break;
			}

			const slackMessage = {
				attachments: [{
					fallback: `${alarmName} state is now ${newState}:\n${reason}`,
					color: color,
					author_name: "Amazon CloudWatch Alarm",
					title: alarmName,
					text: reason,
					fields: [{
						title: "Account ID",
						value: accountId,
						short: true
					}, {
						title: "Region",
						value: region,
						short: true
					}, {
						title: "Old State",
						value: oldState,
						short: true
					}, {
						title: "New State",
						value: newState,
						short: true
					}],
					ts: Slack.toEpochTime(new Date(time))
				}]
			};

			// Render chart
			const trigger = message.Trigger;
			const chart = new Chart({
				metrics: [
					{
						title: `${trigger.MetricName} (${trigger.Statistic}/${trigger.Period}s)`,
						namespace: trigger.Namespace,
						metricName: trigger.MetricName,
						statisticValues: trigger.Statistic,
						unit: trigger.Unit,
						color: "af9cf4",
						thickness: 2,
						dashed: false,
						// Any property other that listed above will be added to Dimensions
						// array. It's different for different metrics namespaces
						dimensions: trigger.Dimensions
					}
				],
				aws: {
					// AWS region
					// region: "us-east-1",
				},
				timeOffset: 1440,  // Get statistic for last 1440 minutes
				timePeriod: 60,    // Get statistic for each 60 seconds
				chartSamples: 144, // Data points extrapolated on chart
				width: 400,        // Result image width. Maximum value for width or height is 1,000. Width x height cannot exceed 300,000.
				height: 250        // Result image height. Maximum value for width or height is 1,000. Width x height cannot exceed 300,000.
			});

			return BbPromise.resolve(chart.getChart())
			.then(chart => chart.getURL())
			.then(url => {
				slackMessage.attachments[0].image_url = url;
				return slackMessage;
			})
			.catch(err => {
				console.log("Error rendering chart:", err.toString());
				return slackMessage;
			});
		});
	}
}

module.exports = CloudWatchParser;
