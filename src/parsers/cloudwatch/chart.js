/**
	Based on `aws-cloudwatch-chart`, a Node module to draw charts for AWS CloudWatch metrics
    @see https://github.com/jeka-kiselyov/aws-cloudwatch-chart

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

	config.json example:
	```js
	{
		"metrics": [
			// array of metrics settings
			{
				// Title of metrics. Will be displayed on chart's legend. Should be unique
				"title": "Server1 Max CPU",
				// Chart line color for this metric
				"color": "af9cf4",
				// Line thickness in px
				"thickness": 2,
				// Dashed or solid
				"dashed": false,

				"query": {
					// AWS namespace
					// http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/aws-namespaces.html
					"Namespace": "AWS/EC2",
					// Metric name
					// http://docs.aws.amazon.com/AmazonCloudWatch/latest/DeveloperGuide/CW_Support_For_AWS.html
					"MetricName": "CPUUtilization",
					// Statistics values. 'Maximum', 'Minimum', 'Sum' and "Average" supported
					"Statistics": ["Maximum"],
					// Unit. http://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_GetMetricStatistics.html
					// 'Percent' and 'Count' currently supported
					"Unit": "Percent",

					"Dimensions": [{
					// Any property other that listed above will be added to Dimensions array. It's different for different metrics namespaces
					// InstanceId. This parameter is for Dimensions array. Different for different metrics namespaces
					// http://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_Dimension.html
					"Name": "InstanceId",
					"Value": "i-2d55aad0",
					}],
				},
			}
		],
		"timeOffset": 24*60*60,	// Get statistic for last 24 hours
		"timePeriod": 60,		// Get statistic for each 60 seconds
		"chartSamples": 20,		// Data points extrapolated on chart
		"width": 1000,			// Result image width. Maximum value for width or height is 1,000. Width x height cannot exceed 300,000.
		"height":250 			// Result image height. Maximum value for width or height is 1,000. Width x height cannot exceed 300,000.
	}
	```
*/

const AWS = require("aws-sdk")
	, _ = require("lodash");

// @see https://developers.google.com/chart/image/docs/data_formats
const extendedEncode = (() => {
	const EXTENDED_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.";
	const EXTENDED_MAP_LEN = EXTENDED_MAP.length;

	return (num, maxVal) => {
		// implicit convert to number
		num = +num;
		// Scale the value to maxVal.
		const scaledVal = Math.floor(EXTENDED_MAP_LEN * EXTENDED_MAP_LEN * num / maxVal);
		if (scaledVal > (EXTENDED_MAP_LEN * EXTENDED_MAP_LEN) - 1) {
			return "..";
		}
		else if (scaledVal < 0) {
			return "__";
		}
		// Calculate first and second digits and add them to the output.
		const quotient = Math.floor(scaledVal / EXTENDED_MAP_LEN);
		const remainder = scaledVal - EXTENDED_MAP_LEN * quotient;
		return EXTENDED_MAP.charAt(quotient) + EXTENDED_MAP.charAt(remainder);
	};
})();

/**
 *
 */
class AwsCloudWatchChart {

	/**
	 * @param {{}} [config] Configuration object
	 * @returns {Promise} Success or failure only
	 */
	static configureAwsSdk(config) {
		return new Promise((resolve, reject) => {
			config = config || {};
			if (config.region) {
				AWS.config.update({
					region: config.region || "us-east-1",
				});
			}

			if (config.accessKeyId && config.secretAccessKey) {
				AWS.config.update({
					accessKeyId: config.accessKeyId,
					secretAccessKey: config.secretAccessKey
				});
				return resolve();
			}

			// Load AWS credentials from environment
			AWS.CredentialProviderChain.defaultProviders = [
				() => new AWS.EnvironmentCredentials("AWS"),
				() => new AWS.EnvironmentCredentials("AMAZON"),
				() => new AWS.SharedIniFileCredentials({ profile: config.profile || "default" }),
				() => new AWS.EC2MetadataCredentials(),
			];

			(new AWS.CredentialProviderChain()).resolve((err, cred) => {
				if (err) {
					reject(err);
				}
				else {
					AWS.config.credentials = cred;
					resolve();
				}
			});
		});
	}

	/**
	 * @param {ChartConfig} config Configuration object
	 */
	constructor(config) {
		if (!config) {
			throw new Error("config parameter is missing");
		}

		this.region = _.get(config, "region");
		this.timeOffset = _.get(config, "timeOffset", 24 * 60 * 60);
		this.timePeriod = _.get(config, "timePeriod", 60);
		this.chartSamples = _.get(config, "chartSamples", 24);
		this.width = _.get(config, "width", 1000);
		this.height = _.get(config, "height", 250);
		this.metrics = [];

		const clientOpt = {
			// Cross-region lookups requires at least 10s
			httpOptions: { timeout: 10000 },
		};
		if (this.region) {
			clientOpt.region = this.region;
		}
		this.cloudwatch = new AWS.CloudWatch(clientOpt);

		if (config.metrics) {
			for (const k in config.metrics) {
				this.addMetric(config.metrics[k]);
			}
		}
	}

	addMetric(params) {
		const m = new AwsCloudWatchChartMetric(this, params);
		this.metrics.push(m);
		return m;
	}

	async load() {
		await Promise.all([
			Promise.all(_.invokeMap(this.metrics, "getStatistics")),
			Promise.all(_.invokeMap(this.metrics, "getThreshold")),
			Promise.all(_.invokeMap(this.metrics, "getMetricFilters")),
		]);
		return this;
	}

	/**
	 * @param {AWS.CloudWatch.Types.GetMetricStatisticsInput} query Query object
	 * @returns {Promise<[]>} Result of call
	 */
	async getStatistics(query) {
		const toTime = new Date();
		const fromTime = new Date();

		fromTime.setTime(toTime.getTime() - this.timeOffset * 1000);

		query = _.assign({
			EndTime: toTime,
			StartTime: fromTime,
			Period: this.timePeriod, // in seconds
		}, query);

		const result = await this.cloudwatch.getMetricStatistics(query).promise();

		if (!result.Datapoints.length) {
			console.log("CloudWatch.getMetricStatics resulted in no datapoints:", JSON.stringify(query));
		}
		return result.Datapoints;
	}

	/**
	 * @param {AWS.CloudWatch.Types.DescribeAlarmsForMetricInput} query Containing query
	 * @returns {Promise<[]>} Result of call
	 */
	async describeAlarm(query) {
		const params = {
			Namespace: query.Namespace,
			MetricName: query.MetricName,
			Dimensions: query.Dimensions,
		};
		const result = await this.cloudwatch.describeAlarmsForMetric(params).promise();
		return _.get(result, "MetricAlarms[0]");
	}

	/**
	 * @param {AWS.CloudWatch.Types.DescribeMetricFiltersRequest} query Containing query
	 * @returns {Promise<[]>} Result of call
	 */
	async getMetricFilters(query) {
		const params = {
			metricName: query.MetricName,
			metricNamespace: query.Namespace,
			limit: 1,
		};
		const clientOpt = {
			httpOptions: { timeout: 10000 },
		};
		if (this.region) {
			clientOpt.region = this.region;
		}
		const cloudwatchlogs = new AWS.CloudWatchLogs(clientOpt);
		const result = await cloudwatchlogs.describeMetricFilters(params).promise();
		return _.get(result, "metricFilters[0]");
	}

	async listMetrics(Namespace, MetricName) {
		if (_.isEmpty(Namespace)) {
			Namespace = "AWS/EC2";
		}
		if (_.isEmpty(MetricName)) {
			MetricName = "CPUUtilization";
		}

		const params = { Namespace, MetricName };
		const result = await this.cloudwatch.listMetrics(params).promise();
		return result.Metrics;
	}


	async save(filename) {
		const fs = require("fs");
		const file = fs.createWriteStream(filename);

		try {
			// wait for file-close
			await new Promise(resolve => {
				file.on("finish", () => {
					file.close(() => resolve(filename)); // close() is async,
				});
			});

			(await this.getAsStream()).pipe(file);
		}
		catch (err) {
			fs.unlink(filename);
			throw err;
		}
	}

	getAsStream() {
		return new Promise((resolve, reject) => {
			require("https")
				.get(this.getURL(), resolve)
				.on("error", reject);
		});
	}

	/**
	 * @returns {Object[]} List of time slices
	 * @internal
	 */
	getTimeSlots() {
		let toTime = 0;
		let fromTime = +new Date();
		let hasDataPoints = false;
		_.each(this.metrics, m => {
			if (m.datapoints.length) {
				hasDataPoints = true;
				const dates = _.map(m.datapoints, s => +new Date(s.Timestamp));
				toTime = Math.max(_.max(dates), toTime);
				fromTime = Math.min(_.min(dates), fromTime);
			}
		});
		if (!hasDataPoints) {
			throw "No datapoints returned from CloudWatch, cannot render empty chart";
		}
		if (!fromTime || !toTime) {
			throw "Cannot render a chart without timeframe";
		}

		const timeSlots = [];
		for (let i = fromTime; i <= toTime;) {
			const from = i;
			i += ((toTime - fromTime) / this.chartSamples);
			const to = i;
			const d = new Date(to);
			timeSlots.push({
				text: ("0" + d.getUTCHours()).slice(-2) + ":" + ("0" + d.getUTCMinutes()).slice(-2),
				from, to,
			});
		}

		return timeSlots;
	}

	/**
	 * Generate a link to CloudWatch page filtering on logs for the given metric.
	 *
	 * @param {number|string} timestamp Time of message
	 * @param {string} [region] Region to set in link
	 * @returns {string} The URL
	 */
	getCloudWatchURL(timestamp, region) {
		// Look up alarm, then metric filter, to get filter pattern so that we can generate a relevant cloudwatch link
		const filterDef = _.get(this.metrics, "[0].filterDef");
		if (!filterDef) {
			return null;
		}
		const { filterPattern, logGroupName } = filterDef;

		// Generates start and end time ISO strings one hour before to one hour after the supplied timestamp
		const eventTime = new Date(timestamp);
		eventTime.setUTCMinutes(0);
		eventTime.setUTCSeconds(0);
		eventTime.setUTCMilliseconds(0);

		const eventHour = eventTime.getUTCHours();
		const startTime = new Date(eventTime);
		startTime.setUTCHours(eventHour - 1);
		const endTime = new Date(eventTime);
		endTime.setUTCHours(eventHour + 1);
		const logsTimeRange = {
			start: startTime.toISOString(),
			end: endTime.toISOString()
		};

		if (!region) {
			region = "us-east-1";
		}
		return `https://console.aws.amazon.com/cloudwatch/home?region=${region}`
			+ `#logEventViewer:group=${encodeURIComponent(logGroupName)}`
			+ `;filter=${encodeURIComponent(filterPattern)}`
			+ `;start=${logsTimeRange.start};end=${logsTimeRange.end}`;
	}

	getURL() {
		if (!this.metrics) {
			throw "No metrics have been defined";
		}
		if (this.width > 1000 || this.height > 1000 || this.height * this.width > 300000) {
			throw new Error("Maximum value for width or height is 1,000. Width x height cannot exceed 300,000.");
		}
		if (this.width < 1 || this.height < 1) {
			throw new Error("Invalid width and height parameters");
		}
		if (this.timePeriod % 60 !== 0) {
			throw new Error("config.timePeriod should be based on 60");
		}

		const timeSlots = this.getTimeSlots();

		const labels = (() => {
			const numLabels = this.width / 50;
			const freq = Math.floor(timeSlots.length / numLabels);
			return _.map(_.filter(timeSlots,
				// always include the right-most slot
				(slot, i) => (timeSlots.length - 1 - i) % freq === 0
			), slot => slot.text);
		})();

		const datasets = _.map(this.metrics, m =>
			_.map(timeSlots, timeSlot => {
				// limit to points that appear within this time slice
				const datapoints = _.filter(m.datapoints, stat => {
					const d = +new Date(stat.Timestamp);
					return d > timeSlot.from && d <= timeSlot.to;
				});

				if (m.query.ExtendedStatistics) {
					// Support percentiles
					const points = _.map(datapoints, stat => stat.ExtendedStatistics[0].value);
					return _.max(points);
				}

				const statName = m.query.Statistics[0];
				// get relevant numbers only
				const points = _.map(datapoints, stat => stat[statName]);

				switch (statName) {
				case "Maximum": return _.max(points);
				case "Minimum": return _.min(points);
				case "Average": return _.sum(points) / (points.length || 1);
				case "Sum": return _.sum(points);
				default: return null;
				}
			}));

		const absMaxValue = _.reduce(datasets, (n, d) => Math.max(n, _.max(d)), 0);
		const topEdge = Math.ceil(absMaxValue*1.05);

		const points = _.map(datasets, d => this.extendedEncodeArr(d, topEdge));
		const colors = _.map(this.metrics, m => m.color);
		const styles = _.map(this.metrics, m => m.dashed ? `${m.thickness},5,5` : m.thickness);
		const titles = _.invokeMap(this.metrics, "getTitle");

		// Add threshold markers
		_.each(this.metrics, m => {
			if (m.threshold <= topEdge) {
				// fill data array with static value
				const pointArray = _.fill(
					new Array(timeSlots.length),
					m.threshold
				);
				points.push(this.extendedEncodeArr(pointArray, topEdge));
				colors.push("FF0000");
				styles.push(".5,5,5");
			}
		});

		// @see https://image-charts.com/documentation
		// @see https://developers.google.com/chart/image/docs/chart_params
		const params = [
			"cht=ls", // chart type
			"chma=20,15,5,5|0,20", // padding (data only, not axis)
			"chxt=x,y", // axis to show
			"chxl=0:|" + _.join(labels, "|"),
			"chco=" + _.join(colors, ","), // line colors
			"chls=" + _.join(styles, "|"), // line style <thickness,dash-length,space-length>|...
			"chs=" + this.width+"x"+this.height,
			// axis scale (must be separate from data scale)
			"chxr=1,0," + topEdge + "," + Math.floor(topEdge / this.height * 20),
			"chg=20,10,1,5",
			// Legend
			"chdl=" + _.join(_.map(titles, t => encodeURIComponent(t)), "|"),
			"chdlp=b", // put legend at bottom
			// Data (last in case of truncation)
			"chd=e:" + _.join(points, ","),
		];

		return "https://chart.googleapis.com/chart?" + _.join(params, "&");
	}

	/**
	 * @param {number[]} arr List of data points
	 * @param {number} maxVal Highest value in map
	 * @returns {string} Chart-ready encoded string
	 * @private
	 */
	extendedEncodeArr(arr, maxVal) {
		return _.join(_.map(arr, n => extendedEncode(n, maxVal)), "");
	}
}

class AwsCloudWatchChartMetric {
	/**
	 * @param {AwsCloudWatchChart} chart Parent chart
	 * @param {{}} params Config object
	 */
	constructor(chart, params) {
		this.chart = chart;

		this.title = null;
		this.color = "FF0000";
		this.thickness = 1;
		this.dashed = false;
		this.datapoints = null;
		this.threshold = null;
		this.filterDef = null;

		this.query = {
			Namespace: "AWS/EC2",
			MetricName: "CPUUtilization",
			Dimensions: [],
			Statistics: ["Average"],
			Unit: "Percent",
		};

		if (params) {
			_.assign(this, params);
		}

		// Support p99 statistics
		const stats = this.query.Statistics;
		const percentiles = _.filter(stats, s => /^p\d\d/i.test(s));
		if (percentiles.length) {
			if (percentiles.length < stats.length) {
				throw "Can only use p00.00 -or- normal statistics, not both!";
			}
			this.query.ExtendedStatistics = percentiles;
			delete this.query.Statistics;
		}
		else {
			// Format for Statistics is {upper-case-letter}{lower-case-word}
			this.query.Statistics = _.map(stats, s => _.upperFirst(_.toLower(s)));
		}
	}

	getTitle() {
		return this.title || _.get(this.query, "Dimensions[0].Value", "");
	}

	async getStatistics() {
		if (this.datapoints) {
			return this.datapoints;
		}
		const data = await this.chart.getStatistics(this.query);
		this.datapoints = data;
		return data;
	}

	async getThreshold() {
		if (this.threshold !== null) {
			return this.threshold;
		}
		const def = await this.chart.describeAlarm(this.query);
		this.threshold = def.Threshold;
		return this.threshold;
	}

	async getMetricFilters() {
		const def = await this.chart.getMetricFilters(this.query);
		this.filterDef = def;
		return def;
	}
}

module.exports = AwsCloudWatchChart;
