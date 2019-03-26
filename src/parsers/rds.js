//
// RDS Message
//
const _ = require("lodash");

module.exports.matches = event =>
	_.get(event.message, "Event Source") === "db-instance";

module.exports.parse = event => {
	const message = event.message;
	const text = _.get(message, "Event Message");
	const instanceId = _.get(message, "Source ID");
	const link = _.get(message, "Identifier Link");
	const time = _.get(message, "Event Time");

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
