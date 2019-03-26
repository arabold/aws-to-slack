/* eslint lodash/prefer-lodash-method:0 */
const _ = require("lodash");

// Match every event
module.exports.matches = () => true;

module.exports.parse = event => {
	// Clone object so we can delete known keys
	const message = _.clone(event.message);
	const fallback = _.isString(message) ? message
		: JSON.stringify(message, null, 2);

	let title = event.getSubject() || "Raw Event",
		author_name = event.getSource() || "<unknown>",
		fields, text;

	if (_.isObject(message)) {
		if (message.source) {
			let t = [];
			if (message.region) {
				t.push(message.region);
				delete message.region;
			}
			if (message.account) {
				t.push(message.account);
				delete message.account;
			}
			t = t.length ? ` (${t.join(" - ")})` : "";
			author_name = `${message.source}${t}`;
			delete message.source;
		}

		if (message["detail-type"]) {
			title = message["detail-type"];
			delete message["detail-type"];
		}

		if (message.time) {
			// automatically picked up by default handler
			delete message.time;
		}

		// Serialize the whole event data
		fields = objectToFields(message);
		text = fields ? ""
			: JSON.stringify(message, null, 2)
				.replace(/^{\n/, "")
				.replace(/\n}\n?$/, "");
	}
	else if (_.isString(message)) {
		text = message;
	}

	return event.attachmentWithDefaults({
		color: event.COLORS.neutral,
		fallback,
		author_name,
		title,
		text,
		fields,
	});
};

function objectToFields(obj) {
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
