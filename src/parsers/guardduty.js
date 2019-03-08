"use strict";

const _ = require("lodash"),
	SNSParser = require("./sns"),
	Slack = require("../slack");

class GuardDutyParser extends SNSParser {

	handleMessage(message) {

		// Check that this is a Guard Duty message
		if (!_.has(message, "source") || message.source !== "aws.guardduty") {
			return false;
		}
		const event = _.get(message, "detail");

		// Alternate check for non-SNS bare messages:
		//if (_.get(event, "service.serviceName") !== "guardduty") {
		//	return false;
		//}

		//const id = _.get(event, "id");
		const title = _.get(event, "title");
		const description = _.get(event, "description");
		const createdAt = new Date(_.get(event, "time"));
		const severity = _.get(event, "severity");
		const accountId = _.get(event, "accountId");
		const region = _.get(event, "region");
		//const partition = _.get(event, "partition");
		//const arn = _.get(event, "arn");
		const type = _.get(event, "type");

		const threatName = _.get(event, "service.additionalInfo.threatName");
		const threatListName = _.get(event, "service.additionalInfo.threatListName");
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

		const actionType = _.get(event, "service.action.actionType");
		const eventFirstSeen = _.get(event, "service.eventFirstSeen");
		const eventLastSeen = _.get(event, "service.eventLastSeen");
		//const archived = _.get(event, "service.archived");
		const count = _.get(event, "service.count");

		if (actionType === "PORT_PROBE") {

			const port = _.get(event, "service.action.portProbeAction.portProbeDetails[0].localPortDetails.port");
			const portName = _.get(event, "service.action.portProbeAction.portProbeDetails[0].localPortDetails.portName");

			const ipAddressV4 = _.get(event, "service.action.portProbeAction.portProbeDetails[0].remoteIpDetails.ipAddressV4");
			const isp = _.get(event, "service.action.portProbeAction.portProbeDetails[0].remoteIpDetails.organization.isp");
			const org = _.get(event, "service.action.portProbeAction.portProbeDetails[0].remoteIpDetails.organization.org");

			const blocked = _.get(event, "service.action.portProbeAction.blocked");

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
		else if (actionType === "AWS_API_CALL" ) {

			const api = _.get(event, "service.action.awsApiCallAction.api");
			const serviceName = _.get(event, "service.action.awsApiCallAction.serviceName");

			const ipAddressV4 = _.get(event, "service.action.awsApiCallAction.remoteIpDetails.ipAddressV4");
			const isp = _.get(event, "service.action.awsApiCallAction.remoteIpDetails.organization.isp");
			const org = _.get(event, "service.action.awsApiCallAction.remoteIpDetails.organization.org");

			const country = _.get(event, "service.action.awsApiCallAction.remoteIpDetails.country.countryName");
			const city = _.get(event, "service.action.awsApiCallAction.remoteIpDetails.city.cityName");

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
				value: JSON.stringify(_.get(event, "service.action"), null, 2),
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

		const resourceType = _.get(event, "resource.resourceType");

		fields.push({
			title: "Resource Type",
			value: resourceType,
			short: true
		});

		if (resourceType === "Instance") {

			const instanceDetails = _.get(event, "resource.instanceDetails");

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

			const accessKeyDetails = _.get(event, "resource.accessKeyDetails");

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
				title: "Unknown Resource Type ("+resourceType+")",
				value: JSON.stringify(_.get(event, "resource"), null, 2),
				short: false
			});
		}

		let color = Slack.COLORS.neutral;
		if (severity === 1) {
			color = Slack.COLORS.critical;
		}
		else if (severity === 2) {
			color = Slack.COLORS.warning;
		}

		return {
			attachments: [{
				author_name: "Amazon GuardDuty",
				fallback: `${title} ${description}`,
				color: color,
				title: title,
				fields: fields,
				mrkdwn_in: [ "title", "text" ],
				ts: Slack.toEpochTime(createdAt)
			}]
		};
	}
}

module.exports = GuardDutyParser;
