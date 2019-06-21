//
// SES "Received" notifications incoming via SNS
// https://docs.aws.amazon.com/ses/latest/DeveloperGuide/notification-contents.html
//
exports.matches = event =>
	_.get(event.message, "notificationType") === "Complaint";

exports.parse = event => {
	const userAgent = event.get("complaint.userAgent");
	const complainedRecipients = event.get("complaint.complainedRecipients");
	const complaintFeedbackType = event.get("complain.complaintFeedbackType");
	const source = event.get("mail.source");
	const destination = event.get("mail.destination");
	const timestamp = event.get("mail.timestamp");
	const subject = event.get("mail.commonHeaders.subject");

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

	let color = event.COLORS.critical
	
	fields.push({
		title: "UserAgent",
		value: `${userAgent}`,
		short: true
	});

	fields.push({
		title: "Complain Type",
		value: `${complaintFeedbackType}`,
		short: true
	});

	return event.attachmentWithDefaults({
		fallback: `Complaint: ${userAgent}`,
		color: color,
		author_name: `Amazon SES - Complaint: ${userAgent}`,
		title: subject,
		text: JSON.stringify(complainedRecipients),
		fields: fields,
		ts: new Date(timestamp)
	});
};
