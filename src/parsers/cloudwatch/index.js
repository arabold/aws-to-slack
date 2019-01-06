"use strict";

const _ = require("lodash"),
	Chart = require("./chart"),
	SNSParser = require("./../sns"),
	Slack = require("../../slack");

class CloudWatchParser extends SNSParser {

	async handleMessage(message, record) {
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
		const regionName = message.Region;
		const time = message.StateChangeTime;
		const region = this.getRegion(record);

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
			image_url = await this.getChartUrl(message);
		}
		catch (err) {
			console.log("Error rendering chart:", err);
		}

		return {
			attachments: [{
				fallback: `${alarmName} state is now ${newState}:\n${reason}`,
				color: color,
				author_name: `AWS CloudWatch Alarm (${accountId})`,
				title: alarmName,
				title_link: `https://console.aws.amazon.com/cloudwatch/home?region=${region}#alarm:name=${alarmName}`,
				text: reason,
				fields: [{
					title: "State Change",
					value: `${oldState} → ${newState}`,
					short: true
				}, {
					title: "Region",
					value: regionName,
					short: true
				}],
				ts: Slack.toEpochTime(new Date(time)),
				image_url,
			}]
		};
	}

	async getChartUrl(message) {
		const trigger = message.Trigger;
		const metric = {
			title: `${trigger.MetricName} (${trigger.Statistic}/${trigger.Period}s)`,
			color: "af9cf4",
			thickness: 2,
			dashed: false,
			query: {
				Namespace: trigger.Namespace,
				MetricName: trigger.MetricName,
				Dimensions: _.map(trigger.Dimensions, d => ({ Name: d.name, Value: d.value })),
				Statistics: [_.upperFirst(_.toLower(trigger.Statistic))],
				Unit: trigger.Unit,
			},
		};
		// try to save a little time and skip describing the alarm
		const thresh = /the threshold \(([\d.-]+)\)/.exec(message.NewStateReason);
		if (thresh) {
			metric.threshold = parseFloat(thresh[1]);
		}

		await Chart.configureAwsSdk();
		const chart = new Chart({
			metrics: [metric],
			timeOffset: 1440,  // Get statistic for last 1440 minutes
			timePeriod: 60,    // Get statistic for each 60 seconds
			chartSamples: 144, // Data points extrapolated on chart
			width: 500,
			height: 220,
		});
		await chart.load();
		return chart.getURL();
	}
}

module.exports = CloudWatchParser;
