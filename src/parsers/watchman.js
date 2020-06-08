//
// Victoria-watchman event parser
//
exports.matches = event =>
	_.has(event.message, 'slack_channel')
	&& event.getSubject().toLowerCase() == 'watchman';

exports.parse = event => {
	
	const payload = _.clone(event.message);
	let title = event.getSubject();
	
	const attachment = {
		fallback: payload.message,
		title: title,
		text: payload.message,
	}

	if (payload.options && payload.options.color) {
		attachment.color = payload.options.color
	}

  slack_message_with_channel = event.attachmentWithDefaults(attachment);
  
  slack_message_with_channel.channel = payload.slack_channel
  slack_message_with_channel.username = process.env.USERNAME
  slack_message_with_channel.icon_emoji = ":victoria:"
  
	return slack_message_with_channel

};
