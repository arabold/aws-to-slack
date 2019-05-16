//
// SES "Received" notifications incoming via SNS
//
exports.matches = event =>
	_.get(event.message, "notificationType") === "Received";

exports.parse = event => {
	const source = event.get("mail.source");
	const destination = event.get("mail.destination");
	const timestamp = event.get("mail.timestamp");
	const subject = event.get("mail.commonHeaders.subject");
	const content = event.get("content");

	const fields = [];
	if (source) {
		fields.push({
			title: "From",
			value: source,
			short: true
		});
	}
	if (destination) {
		fields.push({
			title: "To",
			value: _.join(destination, ",\n"),
			short: true
		});
	}

	return event.attachmentWithDefaults({
		fallback: "New email received from SES",
		color: event.COLORS.accent,
		author_name: "Amazon SES",
		title: subject,
		text: content,
		fields: fields,
		ts: new Date(timestamp),
	});
};
