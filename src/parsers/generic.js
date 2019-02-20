/* eslint lodash/prefer-lodash-method:0 */
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

		// Clone object so we can delete known keys
		const fallback = JSON.stringify(event, null, 2);
		event = _.clone(event);

		let title = "Raw Event",
			author_name = "<unknown>",
			ts = new Date();

		if (event.source) {
			let t = [];
			if (event.region) {
				t.push(event.region);
				delete event.region;
			}
			if (event.account) {
				t.push(event.account);
				delete event.account;
			}
			t = t.length ? ` (${t.join(" - ")})` : "";
			author_name = `${event.source}${t}`;
			delete event.source;
		}

		if (event["detail-type"]) {
			title = event["detail-type"];
			delete event["detail-type"];
		}

		if (event.time) {
			try {
				ts = new Date(event.time);
				delete event.time;
			}
			catch (err) {
				// do nothing
			}
		}

		// Serialize the whole event data
		const fields = this.objectToFields(event);
		const text = fields ? []
			: JSON.stringify(event, null, 2)
				.replace(/^{\n/, "")
				.replace(/\n}\n?$/, "");

		return {
			attachments: [{
				color: Slack.COLORS.neutral,
				ts: Slack.toEpochTime(ts),
				fallback,
				author_name,
				title,
				text,
				fields,
			}]
		};
	}

	handleMessage(message) {
		const title = this.getSubject();
		const time = new Date(this.getTimestamp());
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
					short: val.length < 40,
				});
			}
		}
		return fields;
	}
}

module.exports = GenericParser;
