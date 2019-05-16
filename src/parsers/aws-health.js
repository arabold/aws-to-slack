//
// AWS Health Dashboard Message
//
exports.matches = event =>
	event.getSource() === "health";

exports.parse = event => {
	const accountId = event.get("account");
	const detailType = event.get("detail-type");
	const service = event.get("detail.service");
	const eventTypeCategory = event.get("detail.eventTypeCategory");
	const eventDescription = event.get("detail.eventDescription");
	const affectedEntities = event.get("detail.affectedEntities");
	const time = event.get("time");
	const startTime = event.get("detail.startTime");
	const endTime = event.get("detail.endTime");

	let text = _.get(_.find(eventDescription, ["language", "en_US"]), "latestDescription");
	if (!text) {
		text = _.get(_.first(eventDescription), "latestDescription");
	}

	// Valid type categories are: issue | accountNotification | scheduledChange
	let color = event.COLORS.accent;
	if (eventTypeCategory === "issue") {
		color = event.COLORS.warning;
	}

	const fields = [{
		title: "Account ID",
		value: accountId,
		short: true
	}];
	if (service) {
		fields.push({
			title: "Service",
			value: service,
			short: true
		});
	}
	if (startTime) {
		fields.push({
			title: "Start Time",
			value: (new Date(startTime)).toLocaleString(),
			short: true
		});
	}
	if (endTime) {
		fields.push({
			title: "End Time",
			value: (new Date(endTime)).toLocaleString(),
			short: true
		});
	}
	if (_.size(affectedEntities) > 0) {
		fields.push({
			title: "Affected Entities",
			value: _.join(_.map(affectedEntities, "entityValue"), "\n")
		});
	}

	return event.attachmentWithDefaults({
		fallback: text,
		color: color,
		title: detailType,
		text: formatMrkdwn(text),
		fields: fields,
		ts: new Date(startTime || time),
		mrkdwn_in: ["text"]
	});
};

// Format AWS message for Slack mrkdwn
function formatMrkdwn(text) {
	// Replace `\\n` with `\n`
	return _.replace(text, /\/\/n/gi, "\n");
}
