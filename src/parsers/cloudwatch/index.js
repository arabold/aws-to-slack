//
// CloudWatch Metric Alarm
//
exports.matches = event =>
	_.has(event.message, "AlarmName")
	&& _.has(event.message, "AlarmDescription");

exports.parse = async event => {
	const message = event.message;
	const accountId = message.AWSAccountId;
	const alarmName = message.AlarmName;
	// const description = message.AlarmDescription;
	const oldState = message.OldStateValue;
	const newState = message.NewStateValue;
	const reason = message.NewStateReason;
	const regionName = message.Region;
	const time = message.StateChangeTime;
	const region = event.getRegion();

	let color = event.COLORS.neutral;
	switch (newState) {
	case "OK":
		color = event.COLORS.ok;
		break;
	case "ALARM":
		color = event.COLORS.critical;
		break;
	case "INSUFFICIENT_DATA":
		color = event.COLORS.warning;
		break;
	}

	// Render chart
	let image_url, logsUrl;
	try {
		const chart = await getChart(event);
		logsUrl = chart.getCloudWatchURL(event.getTime(), region);
		image_url = chart.getURL(message);
	}
	catch (err) {
		console.log("Error rendering chart:", err);
	}

	let text = reason;
	if (logsUrl) {
		const logsLink = event.getLink("See recent logs", logsUrl);
		if (logsLink.willPrintLink) {
			text = `${reason} (${logsLink})`;
		}
	}

	return event.attachmentWithDefaults({
		fallback: `${alarmName} state is now ${newState}:\n${reason}`,
		color: color,
		author_name: `AWS CloudWatch Alarm (${accountId})`,
		title: alarmName,
		title_link: event.consoleUrl(`/cloudwatch/home?region=${region}#alarm:name=${alarmName}`),
		text,
		fields: [{
			title: "State Change",
			value: `${oldState} → ${newState}`,
			short: true
		}, {
			title: "Region",
			value: regionName,
			short: true
		}],
		ts: new Date(time),
		image_url,
	});
};

/**
 * Load and resolve chart object.
 *
 * @param {EventDef} event Event def
 * @returns {Promise<AwsCloudWatchChart>} Loaded chart
 */
async function getChart(event) {
	const message = event.message;
	const trigger = message.Trigger;
	const metric = {
		title: `${trigger.MetricName} (${trigger.Statistic}/${trigger.Period}s)`,
		color: "af9cf4",
		thickness: 2,
		dashed: false,
		threshold: trigger.Threshold,
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

	const Chart = require("./chart");
	if (!process.env.LAMBDA_TASK_ROOT) {
		// For local testing, client might require explicit configuration
		await Chart.configureAwsSdk();
	}

	const chart = new Chart({
		metrics: [metric],
		timeOffset: 24 * 60 * 60, // Get statistic for last 24 hours
		timePeriod: 60,    // Get statistic for each 60 seconds
		chartSamples: 144, // Data points extrapolated on chart (1 per 10min)
		width: 500,
		height: 220,

		// NOTE: flow is CloudWatch >> SNS >> Lambda. Each step can be in a different region!
		//   We want region of CloudWatch! So map the regionName to ID, fallback to region of the SNS.
		region: regionNameToId[message.Region] || event.getRegion(),
	});
	await chart.load();
	return chart;
}

const regionNameToId = {
	// Copied from https://docs.aws.amazon.com/general/latest/gr/rande.html
	"US East (Ohio)": "us-east-2",
	"US East (N. Virginia)": "us-east-1",
	"US West (N. California)": "us-west-1",
	"US West (Oregon)": "us-west-2",
	"Asia Pacific (Mumbai)": "ap-south-1",
	"Asia Pacific (Osaka-Local)": "ap-northeast-3",
	"Asia Pacific (Seoul)": "ap-northeast-2",
	"Asia Pacific (Singapore)": "ap-southeast-1",
	"Asia Pacific (Sydney)": "ap-southeast-2",
	"Asia Pacific (Tokyo)": "ap-northeast-1",
	"Canada (Central)": "ca-central-1",
	"China (Beijing)": "cn-north-1",
	"China (Ningxia)": "cn-northwest-1",
	"EU (Frankfurt)": "eu-central-1",
	"EU (Ireland)": "eu-west-1",
	"EU (London)": "eu-west-2",
	"EU (Paris)": "eu-west-3",
	"EU (Stockholm)": "eu-north-1",
	"South America (São Paulo)": "sa-east-1",
	"South America (Sao Paulo)": "sa-east-1",
	"AWS GovCloud (US-East)": "us-gov-east-1",
	"AWS GovCloud (US)": "us-gov-west-1",
};
