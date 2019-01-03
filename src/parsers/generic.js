"use strict";

const _ = require("lodash"),
	SNSParser = require("./sns"),
	Slack = require("../slack");

class GenericParser extends SNSParser {

	async parse(event) {
		try {
			// Attempt to treat as JSON-based SNS message
			const resp = await super.parse(event);
			if (resp) {
				return resp;
			}
		}
		catch (err) {
			// do nothing
		}

		// Serialize the whole event data
		const fields = this.objectToFields(event);
		const text = fields ? undefined : JSON.stringify(event, null, 2);

		return {
			attachments: [{
				color: Slack.COLORS.neutral,
				ts: Slack.toEpochTime(new Date()),
				title: "Raw Event",
				fallback: text,
				text,
				fields,
			}]
		};
	}

	handleMessage(message, record) {
		const title = _.get(record, "Sns.Subject");
		const time = new Date(_.get(record, "Sns.Timestamp"));
		const fields = this.objectToFields(message);
		const fallback = JSON.stringify(message);
		const text = fields ? undefined : fallback;

		return {
			attachments: [{
				color: Slack.COLORS.neutral,
				ts: Slack.toEpochTime(time || new Date()),
				fields,
				title,
				text,
				fallback,
			}]
		};
	}

	objectToFields(obj) {
		let fields;
		const keys = _.keys(obj);
		if (0 < keys.length && keys.length <= 8) {
			fields = [];
			for (const i in keys) {
				const key = keys[i];
				let val = obj[key];
				if (!_.isString(val)) {
					val = JSON.stringify(val);
				}
				fields.push({
					title: key,
					value: val,
					short: val.length < 20,
				});
			}
		}
		return fields;
	}
}

module.exports = GenericParser;
