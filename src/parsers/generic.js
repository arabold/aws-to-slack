//
// Generic event parser
// Should safely be able to parse ANY kind of message and generate a Slack Message containing
// the contents of that structure.
//
exports.matches = () => true; // Match every event

exports.parse = event => {
	// Clone object so we can delete known keys
	const msg = _.clone(event.message);
	const fallback = JSON.stringify(event.record, null, 2);

	let title = event.getSubject() || "Raw Event",
		author_name = event.getSource() || "<unknown>",
		fields, text;

	if (_.isObject(msg)) {
		if (msg.source) {
			let t = [];
			if (msg.region) {
				t.push(msg.region);
				delete msg.region;
			}
			if (msg.account) {
				t.push(msg.account);
				delete msg.account;
			}
			t = t.length ? ` (${t.join(" - ")})` : "";
			author_name = `${msg.source}${t}`;
			delete msg.source;
		}

		if (msg["detail-type"]) {
			title = msg["detail-type"];
			delete msg["detail-type"];
		}

		if (msg.time) {
			// automatically picked up by default handler
			delete msg.time;
		}

		// Serialize the whole event data
		fields = objectToFields(msg);
		text = fields ? ""
		// eslint-disable-next-line lodash/prefer-lodash-method
			: JSON.stringify(msg, null, 2)
				.replace(/^{\n/, "")
				.replace(/\n}\n?$/, "");
	}
	else if (_.isString(msg)) {
		text = msg;
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
		for (const key of keys) {
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
