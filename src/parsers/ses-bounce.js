//
// SES "Received" notifications incoming via SNS
//
exports.matches = event =>
	_.get(event.message, "notificationType") === "Bounce";

exports.parse = event => {
	const bounceType = event.get("bounce.bounceType");
	const bounceSubType = event.get("bounce.bounceSubType");
	const bouncedRecipients = event.get("bounce.bouncedRecipients");
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

	let color = event.COLORS.neutral
	if (bounceType === "Transient") {
		color = event.COLORS.accent;
	}
	else if (bounceType === "Permanent") {
		color = event.COLORS.critical;
	}

	fields.push({
		title: "BounceType",
		value: bounceType,
		short: true
	});
	
	fields.push({
		title: "BounceSubType",
		value: bounceSubType,
		short: true
	});

	return event.attachmentWithDefaults({
		fallback: `Bounce: ${bounceType} - ${bounceSubType}`,
		color: color,
		author_name: `Amazon SES - Bounce: ${bounceType} - ${bounceSubType}`,
		title: subject,
		text: JSON.stringify(bouncedRecipients),
		fields: fields,
		ts: new Date(timestamp)
	});
};
