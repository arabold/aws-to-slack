const _ = require("lodash");

// Init Lodash as a global
// EventDef is a requirement for running a parser, so it's more appropriate
// to put this here instead of within index.js.
global._ = _;

/**
 * Event abstraction to help with Lambda and SNS un-wrapping.
 */
class EventDef {

	constructor(event) {
		this.COLORS = EventDef.COLORS;
		this.rawEvent = event;

		// The "record" is the event data within the Lambda notification
		// but does NOT unwrap SNS message
		this.record = _.get(event, "Records[0]", event);

		// The "message" is the unwrapped data from SNS or the "record" if not from SNS
		let message = _.get(this.record, "Sns.Message") || this.record;
		if (_.isString(message) && _.startsWith(message, "{") && _.endsWith(message, "}")) {
			try {
				message = JSON.parse(message);
			}
			catch (err) {
				console.log(`Message looked like JSON, but failed parse: ${err.message}`, this.record);
			}
		}
		this.message = message;
	}

	/**
	 * Default data retrieval method.
	 *
	 * @param {string} path Lodash path syntax
	 * @param {*} [defaultValue] Default value if missing
	 * @returns {*} Value within message
	 */
	get(path, defaultValue) {
		return _.get(this.message, path, defaultValue);
	}

	/**
	 * Pull details from an AWS ARN.
	 *
	 * @param {string} arn An ARN to parse
	 * @returns {{product: string, region: string, account: string, suffix: (string|undefined)}} Object describing ARN
	 */
	parseArn(arn) {
		// Example: arn:aws:sns:region:account-id:topicname:subscriptionid
		const parts = _.split(arn, ":", 7);
		return {
			product: parts[2],
			region: parts[3],
			account: parts[4],
			resource: parts[5],
			suffix: parts[6],
		};
	}

	/**
	 * @returns {{product: string, region: string, account: string, suffix: (string|undefined)}} Object describing ARN
	 * @internal
	 */
	getArn() {
		const arn = _.get(this.message, "resources[0]")
			|| _.get(this.message, "arn")
			|| _.get(this.record, "EventSubscriptionArn");
		return this.parseArn(arn);
	}

	/**
	 * Get product name from event source.
	 * This will strip the "aws." prefix so that source would potentially match the ARN definition.
	 *
	 * @returns {string} Source property of event
	 */
	getSource() {
		const src = _.get(this.message, "source");
		if (src) {
			return _.startsWith(src, "aws.")
				? src.substr(4)
				: src;
		}
		return this.getArn().product;
	}

	/**
	 * Get SNS subject from current record.
	 *
	 * @returns {string|undefined} The Sns.Subject field
	 */
	getSubject() {
		//TODO: atm, this only matches SNS messages
		return _.get(this.record, "Sns.Subject");
	}

	/**
	 * Get timestamp from current record.
	 *
	 * @returns {Date|undefined} Date/time of event.
	 */
	getTime() {
		const val = _.get(this.message, "time")
			|| _.get(this.message, "Time")
			|| _.get(this.message, "Timestamp")
			|| _.get(this.record, "Sns.Timestamp");
		if (!val) {
			return undefined;
		}
		const d = new Date(val);
		if (!d.getTime()) {
			return undefined;// don't return bad date
		}
		return d;
	}

	/**
	 * Get region from an ARN found in the current event.
	 *
	 * @param {string} defaultValue Value to return if no region found.
	 * @returns {string} Region string
	 */
	getRegion(defaultValue = "us-east-1") {
		return this.message.region || this.getArn().region || defaultValue;
	}

	/**
	 * Get Account ID from SNS ARN of the current event.
	 *
	 * @returns {string} Account ID string
	 */
	getAccountId() {
		return this.getArn().account;
	}

	/**
	 * Output a link.
	 *
	 * @param {string} text Text to display
	 * @param {string} url Partial or full URL
	 * @returns {SlackLink} Object with toString() method
	 */
	getLink(text, url) {
		return new SlackLink(url, text);
	}

	/**
	 * Convenience function to normalize a path into
	 * a fully-qualified AWS Console URL.
	 *
	 * @param {string} path Path to AWS tool
	 * @returns {string} Normalized AWS Console link
	 */
	consoleUrl(path) {
		// all links should include a region parameter
		const hasRegion = /[&?]region=(\w[\w-]+)/.exec(path) ? RegExp.$1 : "";
		const region = hasRegion || this.getRegion("");

		// ensure link contains scheme + domain
		let url = String(path);
		if (_.startsWith(url, "//")) {
			url = "https:" + url;
		}
		else if (_.startsWith(url, "/")) {
			if (_.startsWith(region, "cn-")) {
				url = "https://console.amazonaws.cn" + url;
			}
			else {
				url = "https://console.aws.amazon.com" + url;
			}
		}

		if (!hasRegion && region) {
			const _urllib = require("url");
			const u = _urllib.parse(url);
			if (u) {
				const qs = require("querystring");
				let hasRegion = false,
					qsObj = {};
				if (u.query) {
					qsObj = qs.parse(u.query) || {};
					if (qsObj.region) {
						hasRegion = true;
					}
				}
				if (!hasRegion) {
					// add region and re-generate link
					qsObj.region = region;
					url = `${u.protocol}//${u.host}${u.pathname||""}?${qs.stringify(qsObj)}${u.hash||""}`;
				}
			}
			else {
				console.error(`event.consoleUrl(): given unparsable path: ${path}`);
			}
		}

		return url;
	}

	/**
	 * Fill default info and return a valid Slack message.
	 *
	 * @param {{}} attachment Attachment definition
	 * @returns {{attachments: [{}]}} Slack message definition
	 */
	attachmentWithDefaults(attachment) {
		if (!attachment.ts) {
			attachment.ts = this.getTime() || new Date();
		}
		if (_.isDate(attachment.ts)) {
			attachment.ts = attachment.ts.getTime() / 1000 | 0;
		}

		if (!attachment.footer) {
			// Add link to SNS ARN in footer
			// Example: arn:aws:sns:region:account-id:topicname:subscriptionid
			const snsArn = _.get(this.record, "EventSubscriptionArn");
			if (snsArn) {
				const arn = this.parseArn(snsArn);
				// separate topic from subscription
				const topic = _.split(arn.suffix, ":")[0];
				const url = this.consoleUrl(`/sns/v2/home?region=${arn.region}#/topics/arn:aws:sns:${arn.region}:${arn.account}:${topic}`);
				const signin = `https://${arn.account}.signin.aws.amazon.com/console/sns?region=${arn.region}`;
				// limit visible length of topic
				const topicVisible = topic.length > 40
					? topic.substr(0, 35) + "..."
					: topic;

				const snsLink = this.getLink(`SNS ${topicVisible}`, url);
				const signinLink = this.getLink("Sign-In", signin);
				attachment.footer = `Received via ${snsLink} | ${signinLink}`;

				// footer is limited to 300 chars, seemingly including URLs
				// https://api.slack.com/docs/message-attachments#footer
				if (attachment.footer.length > 300) {
					attachment.footer = `Received via ${snsLink}`;
				}
			}
		}

		return {
			attachments: [ attachment ],
		};
	}
}

class SlackLink {
	/**
	 * @param {string} url Full URL with protocol
	 * @param {string} text Text to display
	 */
	constructor(url, text) {
		this.url = url;
		this.text = text;
		this.willPrintLink = !/true|1/i.test(process.env.HIDE_AWS_LINKS || "");
	}

	/**
	 * Get Slack-syntax link as a string.
	 * @returns {string} Slack-formatted link
	 */
	toString() {
		if (!this.willPrintLink) {
			return this.text;
		}
		return `<${this.url}|${this.text}>`;
	}
}

/**
 * Clone so sub-modules never have to explicitly import the Slack module.
 */
EventDef.COLORS = require("./slack").COLORS;

module.exports = EventDef;
