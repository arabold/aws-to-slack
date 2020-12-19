//
// RDS Message
//
exports.matches = event => event.getSource() === "rds";

exports.parse = event => {
	const text = event.get("detail.Message");
	const instanceId = event.get("detail.SourceIdentifier");
	const region = event.parseArn(event.get("detail.SourceArn")).region;
	const cluster = event.parseArn(event.get("detail.SourceArn")).resource.slice(8);
	const time = event.get("time");
	var link = `https://console.aws.amazon.com/rds/home?region=${region}#database:id=${instanceId};is-cluster=true`;

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
