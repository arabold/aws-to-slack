//
// SES "Received" notifications incoming via SNS
//
module.exports.matches = event =>
	_.get(event.message, "notificationType") === "Received";

module.exports.parse = event => {
	const message = event.message;
	const source = _.get(message, "mail.source");
	const destination = _.get(message, "mail.destination");
	const timestamp = _.get(message, "mail.timestamp");
	const subject = _.get(message, "mail.commonHeaders.subject");
	const content = _.get(message, "content");

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
