//
// AWS GuardDuty event parser
//
exports.matches = event =>
	event.getSource() === "guardduty"
	|| _.get(event.message, "detail.service.serviceName") === "guardduty";

exports.parse = event => {
	const detail = event.get("detail");

	//const id = _.get(detail, "id");
	const title = _.get(detail, "title");
	const description = _.get(detail, "description");
	const createdAt = new Date(_.get(detail, "time"));
	const severity = _.get(detail, "severity");
	const accountId = _.get(detail, "accountId");
	const region = _.get(detail, "region");
	//const partition = _.get(event, "partition");
	//const arn = _.get(event, "arn");
	const type = _.get(detail, "type");

	const threatName = _.get(detail, "service.additionalInfo.threatName");
	const threatListName = _.get(detail, "service.additionalInfo.threatListName");
	const fields = [];

	fields.push({
		title: "Description",
		value: description,
		short: false
	});

	fields.push({
		title: "Account",
		value: accountId,
		short: true
	});

	fields.push({
		title: "Region",
		value: region,
		short: true
	});

	fields.push({
		title: "Type",
		value: type,
		short: true
	});

	fields.push({
		title: "Severity",
		value: severity,
		short: true
	});

	fields.push({
		title: threatName,
		value: threatListName,
		short: true
	});

	const actionType = _.get(detail, "service.action.actionType");
	const eventFirstSeen = _.get(detail, "service.eventFirstSeen");
	const eventLastSeen = _.get(detail, "service.eventLastSeen");
	//const archived = _.get(event, "service.archived");
	const count = _.get(detail, "service.count");

	if (actionType === "PORT_PROBE") {

		const port = _.get(detail, "service.action.portProbeAction.portProbeDetails[0].localPortDetails.port");
		const portName = _.get(detail, "service.action.portProbeAction.portProbeDetails[0].localPortDetails.portName");

		const ipAddressV4 = _.get(detail, "service.action.portProbeAction.portProbeDetails[0].remoteIpDetails.ipAddressV4");
		const isp = _.get(detail, "service.action.portProbeAction.portProbeDetails[0].remoteIpDetails.organization.isp");
		const org = _.get(detail, "service.action.portProbeAction.portProbeDetails[0].remoteIpDetails.organization.org");

		const blocked = _.get(detail, "service.action.portProbeAction.blocked");

		fields.push({
			title: "Port probe details",
			value: `port ${port} - ${portName}`,
			short: true
		});

		fields.push({
			title: "Remote probe origin",
			value: `${ipAddressV4}\n${isp} - ${org}`,
			short: true
		});

		fields.push({
			title: "Blocked",
			value: `${blocked}`,
			short: true
		});
	}
	else if (actionType === "AWS_API_CALL") {

		const api = _.get(detail, "service.action.awsApiCallAction.api");
		const serviceName = _.get(detail, "service.action.awsApiCallAction.serviceName");

		const ipAddressV4 = _.get(detail, "service.action.awsApiCallAction.remoteIpDetails.ipAddressV4");
		const isp = _.get(detail, "service.action.awsApiCallAction.remoteIpDetails.organization.isp");
		const org = _.get(detail, "service.action.awsApiCallAction.remoteIpDetails.organization.org");

		const country = _.get(detail, "service.action.awsApiCallAction.remoteIpDetails.country.countryName");
		const city = _.get(detail, "service.action.awsApiCallAction.remoteIpDetails.city.cityName");

		fields.push({
			title: "Service",
			value: `${serviceName} - ${api}`,
			short: true
		});

		fields.push({
			title: "API origin",
			value: `${ipAddressV4}\n${isp} - ${org}`,
			short: true
		});

		fields.push({
			title: "Location",
			value: `${country} - ${city}`,
			short: true
		});
	}
	else {
		console.log(`Unknown GuardDuty actionType '${actionType}'`);

		fields.push({
			title: "Unknown Action Type (${actionType})",
			value: JSON.stringify(_.get(detail, "service.action"), null, 2),
			short: false
		});
	}

	if (count > 1) {
		fields.push({
			title: "First Event Time",
			value: eventFirstSeen,
			short: true
		});

		fields.push({
			title: "Last Event Time",
			value: eventLastSeen,
			short: true
		});

		fields.push({
			title: "Event count",
			value: count,
			short: false
		});
	}

	const resourceType = _.get(detail, "resource.resourceType");

	fields.push({
		title: "Resource Type",
		value: resourceType,
		short: true
	});

	if (resourceType === "Instance") {

		const instanceDetails = _.get(detail, "resource.instanceDetails");

		const instanceId = _.get(instanceDetails, "instanceId");
		const instanceType = _.get(instanceDetails, "instanceType");

		fields.push({
			title: "Instance ID",
			value: instanceId,
			short: true
		});

		fields.push({
			title: "Instance Type",
			value: instanceType,
			short: true
		});

		const tags = _.get(instanceDetails, "tags");

		for (let i = 0; i < tags.length; i++) {
			const key = tags[i].key;
			const value = tags[i].value;

			fields.push({
				title: key,
				value: value,
				short: true
			});
		}

	}
	else if (resourceType === "AccessKey") {

		const accessKeyDetails = _.get(detail, "resource.accessKeyDetails");

		const accessKeyId = _.get(accessKeyDetails, "accessKeyId");
		const principalId = _.get(accessKeyDetails, "principalId");
		const userType = _.get(accessKeyDetails, "userType");
		const userName = _.get(accessKeyDetails, "userName");

		fields.push({
			title: "AccessKeyId",
			value: accessKeyId,
			short: true
		});
		fields.push({
			title: "PrincipalId",
			value: principalId,
			short: true
		});
		fields.push({
			title: "User Type",
			value: userType,
			short: true
		});
		fields.push({
			title: "User Name",
			value: userName,
			short: true
		});

	}
	else {
		console.log(`Unknown GuardDuty resourceType '${resourceType}'`);

		fields.push({
			title: "Unknown Resource Type (" + resourceType + ")",
			value: JSON.stringify(_.get(detail, "resource"), null, 2),
			short: false
		});
	}

	let color = event.COLORS.neutral;
	if (severity === 1) {
		color = event.COLORS.critical;
	}
	else if (severity === 2) {
		color = event.COLORS.warning;
	}

	return event.attachmentWithDefaults({
		author_name: "Amazon GuardDuty",
		fallback: `${title} ${description}`,
		color: color,
		title: title,
		fields: fields,
		mrkdwn_in: ["title", "text"],
		ts: createdAt,
	});
};
