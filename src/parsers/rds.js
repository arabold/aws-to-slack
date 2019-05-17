//
// RDS Message
//
exports.matches = event =>
	_.get(event.message, "Event Source") === "db-instance";

exports.parse = event => {
	const text = event.get("Event Message");
	const instanceId = event.get("Source ID");
	const link = event.get("Identifier Link");
	const time = event.get("Event Time");

	return event.attachmentWithDefaults({
		fallback: `${instanceId}: ${text}`,
		color: event.COLORS.accent,
		author_name: "Amazon RDS",
		title: instanceId,
		title_link: link,
		text: text,
		ts: new Date(time)
	});
};
