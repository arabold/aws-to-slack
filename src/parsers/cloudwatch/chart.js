/**
	Based on `aws-cloudwatch-chart`, a Node module to draw charts for
	AWS CloudWatch metrics: https://github.com/jeka-kiselyov/aws-cloudwatch-chart

	Usage:
	```js
	var AwsCloudWatchChart = require('aws-cloudwatch-chart');
	var config = require('./config.json');
	var acs = new AwsCloudWatchChart(config);
	return acs.getChart()
	.then(chart => chart.save('image.png'))
	.then(filename => {
		// filename should be 'image.png'; this is your chart.
	});
	```

	or
	```js
	acs.getChart().then(function(chart){
		chart.get().then(function(image){
			// image is png image.
		}
	});
	```

	config.json example:
	```js
	{
		"metrics": [
			// array of metrics settings
			{
				// Title of metrics. Will be displayed on chart's legend. Should be unique
				"title": "Server1 Max CPU",
				// AWS namespace
				// http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/aws-namespaces.html
				"namespace": "AWS/EC2",
				// Metric name
				// http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/CW_Support_For_AWS.html
				"metricName": "CPUUtilization",
				// Statistics values. 'Maximum', 'Minimum', 'Sum' and "Average" supported
				"statisticValues": "Maximum",
				// Unit. http://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricStatistics.html
				// 'Percent' and 'Count' currently supported
				"unit": "Percent",
				// Chart line color for this metric
				"color": "af9cf4",
				// Line thickness in px
				"thickness": 2,
				// Dashed or solid
				"dashed": false,
				// Any property other that listed above will be added to Dimensions array. It's different for different metrics namespaces
				// InstanceId. This parameter is for Dimensions array. Different for different metrics namespaces
				// http://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Dimension.html
				"InstanceId": "i-2d55aad0",
			}
		],
		"aws": {
			// AWS IAM accessKeyId
			// Dpn't forget to allow IAM to access CloudWatch. Not other policies are required. Safe.
			"accessKeyId": "123456789012XXXXXX",
			// AWS IAM secretAccessKey
			"secretAccessKey": "XXXXXX/XXXXXXXXX/XXXXXXXXXXX/XXXXXXXXX",
			// AWS region
			"region": "us-east-1"
		},
		"timeOffset": 1440,		// Get statistic for last 1440 minutes
		"timePeriod": 60,		// Get statistic for each 60 seconds
		"chartSamples": 20,		// Data points extrapolated on chart
		"width": 1000,			// Result image width. Maximum value for width or height is 1,000. Width x height cannot exceed 300,000.
		"height":250 			// Result image height. Maximum value for width or height is 1,000. Width x height cannot exceed 300,000.
	}
	```
*/

const BbPromise = require("bluebird")
	, AWS = require("aws-sdk")
	, https = require("https")
	, url = require("url")
	, fs = require("fs")
	, _ = require("lodash");


class AwsCloudWatchChart {

	constructor(config) {

		if (_.isUndefined(config)) {
			throw new Error("config parameter is missing");
		}

		const region = _.get(config, "aws.region", "us-east-1");
		AWS.config.update({ region });

		if (_.has(config, "aws.accessKeyId") && _.has(config, "aws.secretAccessKey")) {
			AWS.config.update({
				accessKeyId: config.aws.accessKeyId,
				secretAccessKey: config.aws.secretAccessKey
			});
		}
		else {
			// Load AWS credentials from environment
			AWS.CredentialProviderChain.defaultProviders = [
				() => new AWS.EnvironmentCredentials("AWS"),
				() => new AWS.EnvironmentCredentials("AMAZON"),
				() => new AWS.SharedIniFileCredentials({ profile: _.get(config, "aws.profile", "default") }),
				() => new AWS.EC2MetadataCredentials()
			];

			const chain = new AWS.CredentialProviderChain();
			chain.resolve((err, cred) => {
				AWS.config.credentials = cred;
			});
		}

		this.cloudwatch = new AWS.CloudWatch({
			apiVersion: "2010-08-01",
			region
		});

		this.metrics = [];

		this.timeOffset = _.get(config, "timeOffset", 24 * 60);
		this.timePeriod = _.get(config, "timePeriod", 60);
		this.chartSamples = _.get(config, "chartSamples", 24);

		this.width = _.get(config, "width", 1000);
		this.height = _.get(config, "height", 250);

		if (this.width > 1000 || this.height > 1000 || this.height * this.width > 300000) {
			throw new Error("Maximum value for width or height is 1,000. Width x height cannot exceed 300,000.");
		}

		if (this.width < 1 || this.height < 1) {
			throw new Error("Invalid width and height parameters");
		}

		if (this.timePeriod % 60 !== 0) {
			throw new Error("config.timePeriod should be based on 60");
		}

		if (_.has(config, "metrics") || !_.isArray(config.metrics)) {
			for (const k in config.metrics) {
				this.addMetric(config.metrics[k]);
			}
		}
		else {
			throw new Error("config.metrics array required");
		}

		this.EXTENDED_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.";
	}

	addMetric(params) {
		const m = new AwsCloudWatchChartMetric(this);
		if (!_.isUndefined(params)) {
			for (const k in params) {
				const kl = _.toLower(k);
				if (kl === "title") {
					m.title = "" + params[k];
				}
				else if (kl === "statisticvalues") {
					m.statisticValues = params[k];
				}
				else if (kl === "namespace") {
					m.Namespace = "" + params[k];
				}
				else if (kl === "metricname") {
					m.MetricName = "" + params[k];
				}
				else if (kl === "color") {
					m.color = params[k];
				}
				else if (kl === "unit") {
					m.Unit = params[k];
				}
				else if (kl === "thickness") {
					m.thickness = parseInt(params[k], 10);
				}
				else if (kl === "dashed") {
					m.dashed = (params[k] ? true : false);
				}
				else if (kl === "dimensions") {
					// merge to dimensions
					m.Dimensions = _.concat(m.Dimensions, _.map(params[k], d => (
						{ Name: d.name, Value: d.value }
					)));
				}
				else {
					m.Dimensions.push({ Name: k, Value: params[k] });
				}
			}
		}

		this.metrics.push(m);
		return m;
	}

	getFromTimeString() {
		const i = new Date;
		i.setTime(i.getTime() - this.timeOffset*60*1000);
		return (i.getUTCMonth() + 1) + "/" + i.getUTCDate() + " " + ("0" +
			i.getUTCHours()).slice(-2) + ":" + ("0" + i.getUTCMinutes()).slice(-2);
	}

	getToTimeString() {
		const i = new Date;
		return (i.getUTCMonth() + 1) + "/" + i.getUTCDate() + " " + ("0" +
			i.getUTCHours()).slice(-2) + ":" + ("0" + i.getUTCMinutes()).slice(-2);
	}

	getChart() {
		return BbPromise.map(this.metrics, metrics => metrics.getStatistics())
		.return(this);
	}

	listMetrics(Namespace, MetricName) {
		if (_.isEmpty(Namespace)) {
			Namespace = "AWS/EC2";
		}
		if (_.isEmpty(MetricName)) {
			MetricName = "CPUUtilization";
		}

		const params = { Namespace: Namespace, MetricName: MetricName };

		return BbPromise.fromCallback(cb => this.cloudwatch.listMetrics(params, cb))
		.then(data => data.Metrics)
		.catch(err => BbPromise.reject(new Error("Error loading metrics list: " + err.toString())));
	}

	extendedEncode(arrVals, maxVal) {
		let chartData = "";
		const EXTENDED_MAP_LENGTH = this.EXTENDED_MAP.length;
		for (let i = 0, len = arrVals.length; i < len; i++) {
			const numericVal = new Number(arrVals[i]);
			// Scale the value to maxVal.
			const scaledVal = Math.floor(EXTENDED_MAP_LENGTH * EXTENDED_MAP_LENGTH * numericVal / maxVal);

			if(scaledVal > (EXTENDED_MAP_LENGTH * EXTENDED_MAP_LENGTH) - 1) {
				chartData += "..";
			}
			else if (scaledVal < 0) {
				chartData += "__";
			}
			else {
				// Calculate first and second digits and add them to the output.
				const quotient = Math.floor(scaledVal / EXTENDED_MAP_LENGTH);
				const remainder = scaledVal - EXTENDED_MAP_LENGTH * quotient;
				chartData += this.EXTENDED_MAP.charAt(quotient) + this.EXTENDED_MAP.charAt(remainder);
			}
		}

		return chartData;
	}

	save(filename) {
		const url = this.getURL();

		const file = fs.createWriteStream(filename);
		return new BbPromise((resolve, reject) => {
			https.get(url, response => {
				response.pipe(file);
				file.on("finish", () => {
					file.close(() => resolve(filename)); // close() is async,
				});
			}).on("error", err => {
				fs.unlink(filename);
				reject(err);
			});
		});
	}

	get() {
		const requestSettings = url.parse(this.getURL());
		requestSettings.method = "GET";

		return new BbPromise((resolve, reject) => {
			https.request(requestSettings, response => {
				const chunks = [];
				response.on("data", chunk => chunks.push(chunk));
				response.on("error", err => {
					reject(err);
				});
				response.on("end", () => {
					resolve({
						body: Buffer.concat(chunks),
						statusCode: response.statusCode,
						statusMessage: response.statusMessage,
					});
				});
				return response;
			});
		});
	}

	getURL() {
		let toTime = false;
		let fromTime = false;
		let absMaxValue = 0;

		for (const km in this.metrics) {
			for (const ks in this.metrics[km].statistics) {
				const d = new Date(this.metrics[km].statistics[ks].Timestamp);
				if (toTime === false) {
					toTime = d;
				}
				if (fromTime === false) {
					fromTime = d;
				}

				if (d > toTime) {
					toTime = d;
				}
				if (d < fromTime) {
					fromTime = d;
				}
			}
		}

		if (!fromTime || !toTime) {
			// Cannot render a chart without timeframe
			return "";
		}

		const diff = (toTime - fromTime);
		const timeSlots = [];
		let prevTime = false;
		for (let i = fromTime.getTime(); i <= toTime.getTime(); i += (diff / this.chartSamples)) {
			if (prevTime !== false) {
				const to = new Date(i);
				timeSlots.push({
					text: ("0" + to.getUTCHours()).slice(-2)+":"+("0" + to.getUTCMinutes()).slice(-2),
					from: new Date(prevTime),
					to: to
				});
			}
			prevTime = i;
		}

		const numLabels = this.width / 50;
		const freq = Math.floor(_.size(timeSlots) / numLabels);
		const labels = _.reverse(_.map(_.reverse(_.clone(timeSlots)), (ts, i) => {
			if (i % freq === 0) {
				return ts.text;
			}
			return "";
		}));

		const datasets = [];
		for (const km in this.metrics) {
			const metrics = this.metrics[km];
			const dataset = [];

			for (const ktl in timeSlots) {
				let maxInPeriod = 0;
				let minInPeriod = 0;
				let totalInPeriod = 0;
				let totalInPeriodCount = 0;
				for (const ks in metrics.statistics) {
					const statistics = metrics.statistics[ks];
					const d = new Date(statistics.Timestamp);
					if (d > timeSlots[ktl].from && d<= timeSlots[ktl].to) {
						if (!_.isUndefined(statistics.Maximum)) {
							if (maxInPeriod < statistics.Maximum) {
								maxInPeriod = statistics.Maximum;
							}
						}
						else if (!_.isUndefined(statistics.Minimum)) {
							if (minInPeriod < statistics.Minimum) {
								minInPeriod = statistics.Minimum;
							}
						}
						else if (!_.isUndefined(statistics.Average)) {
							totalInPeriod+=statistics.Average;
							totalInPeriodCount++;
						}
						else if (!_.isUndefined(statistics.Sum)) {
							totalInPeriod+=statistics.Sum;
							totalInPeriodCount++;
						}
					}
				}

				let averageInPeriod = totalInPeriod;
				if (totalInPeriodCount > 0) {
					averageInPeriod = totalInPeriod / totalInPeriodCount;
				}

				let toPush;
				if (_.toUpper(metrics.statisticValues) === "MAXIMUM") {
					toPush = maxInPeriod;
				}
				else if (_.toUpper(metrics.statisticValues) === "MINIMUM") {
					toPush = minInPeriod;
				}
				else if (_.toUpper(metrics.statisticValues) === "SUM") {
					toPush = totalInPeriod;
				}
				else {
					toPush = averageInPeriod;
				}

				if (toPush > absMaxValue) {
					absMaxValue = toPush;
				}

				dataset.push(toPush);
			}

			datasets.push(dataset);
		}

		const topEdge = Math.ceil(absMaxValue*1.2);

		const datasetsAsStrings = [];
		for (const k in datasets) {
			datasetsAsStrings.push(this.extendedEncode(datasets[k], topEdge));
		}

		const datasetsAsString = _.join(datasetsAsStrings, ",");

		const titles = [];
		for (const km in this.metrics) {
			titles.push(this.metrics[km].getTitle());
		}

		const colors = [];
		for (const km in this.metrics) {
			colors.push(this.metrics[km].color);
		}

		const styles = [];
		for (const km in this.metrics) {
			if (this.metrics[km].dashed) {
				styles.push(this.metrics[km].thickness+",5,5");
			}
			else {
				styles.push(this.metrics[km].thickness);
			}
		}

		// https://image-charts.com/documentation
		const params = [];
		params.push("cht=ls");
		params.push("chxl=0:|" + _.join(labels, "|"));
		params.push("chxt=x,y");
		params.push("chco=" + _.join(colors, ","));
		params.push("chls=" + _.join(styles, "|"));
		params.push("chs=" + this.width+"x"+this.height);
		params.push("chxr=1,0," + topEdge + "," + parseInt(topEdge / this.height * 20));
		params.push("chg=20,10,1,5");
		params.push("chdl=" + _.join(_.map(titles, t => encodeURIComponent(t)), "|"));
		params.push("chd=e:" + datasetsAsString);
		params.push("chdlp=b"); // legend at bottom

		const url = "https://chart.googleapis.com/chart?" + _.join(params, "&");
		console.log(url);

		return url;
	}
}

class AwsCloudWatchChartMetric {

	constructor(AwsCloudWatchChart) {
		this.Namespace = "AWS/EC2";
		this.MetricName = "CPUUtilization";
		this.Dimensions = [];
		this.Unit = "Percent";

		this.AwsCloudWatchChart = AwsCloudWatchChart;
		this.cloudwatch = AwsCloudWatchChart.cloudwatch;

		this.title = false;

		this.statistics = [];
		this.isLoaded = false;

		this.statisticValues = "Average";
		this.color = "FF0000";
		this.thickness = "1";
		this.dashed = false;
	}

	getStatistics() {
		const toTime = new Date();
		const fromTime = new Date();

		fromTime.setTime(toTime.getTime() - this.AwsCloudWatchChart.timeOffset * 60 * 1000);

		const params = {
			EndTime: toTime,
			StartTime: fromTime,
			MetricName: this.MetricName,
			Namespace: this.Namespace,
			Period: this.AwsCloudWatchChart.timePeriod,
			Statistics: [ _.upperFirst(_.toLower(this.statisticValues)) ],
			Dimensions: this.Dimensions,
			Unit: this.Unit
		};

		return BbPromise.fromCallback(cb => this.cloudwatch.getMetricStatistics(params, cb))
		.then(data => {
			for (const k in data.Datapoints) {
				this.statistics.push(data.Datapoints[k]);
			}
			this.isLoaded = true;
			return BbPromise.resolve(this.statistics);
		})
		.catch(err => BbPromise.reject(new Error("Error loading statistics: " + err.toString())));
	}

	getTitle() {
		if (this.title !== false) {
			return this.title;
		}
		if (_.has(this, "Dimensions[0].Value")) {
			return this.Dimensions[0].Value;
		}
	}

}

module.exports = AwsCloudWatchChart;
