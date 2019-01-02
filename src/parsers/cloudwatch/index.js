"use strict";

const _ = require("lodash"),
	Chart = require("./chart"),
	SNSParser = require("./../sns"),
	Slack = require("../../slack");

class CloudWatchParser extends SNSParser {

	async handleMessage(message) {
		if (!_.has(message, "AlarmName") || !_.has(message, "AlarmDescription")) {
			return false;// not relevant
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
		switch (newState) {
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

		// Render chart
		let image_url;
		try {
			image_url = await this.getChartUrl(message.Trigger);
		}
		catch (err) {
			console.log("Error rendering chart:", err);
		}

		const signInLink = `https://${accountId}.signin.aws.amazon.com/console/cloudwatch?region=${region}#alarm:name=${alarmName}`;
		const consoleLink = `https://console.aws.amazon.com/cloudwatch/home?region=${region}#alarm:name=${alarmName}`;

		return {
			attachments: [{
				fallback: `${alarmName} state is now ${newState}:\n${reason}`,
				color: color,
				author_name: `AWS CloudWatch Alarm (${accountId})`,
				author_link: signInLink,
				title: alarmName,
				title_link: consoleLink,
				text: reason,
				fields: [{
					title: "State Change",
					value: `${oldState} → ${newState}`,
					short: true
				}, {
					title: "Region",
					value: region,
					short: true
				}],
				ts: Slack.toEpochTime(new Date(time)),
				image_url,
			}]
		};
	}

	async getChartUrl(trigger) {
		const chart = new Chart({
			metrics: [{
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
			}],
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
		await chart.getChart();
		return chart.getURL();
	}
}

module.exports = CloudWatchParser;
