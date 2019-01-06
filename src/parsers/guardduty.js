"use strict";

const BbPromise = require("bluebird"),
	_ = require("lodash"),
	Slack = require("../slack");

class GuardDutyParser {

	parse(event) {
		return BbPromise.try(() => _.isObject(event) ? event : JSON.parse(event))
		.catch(_.noop) // ignore JSON errors
		.then(event => {
			if (_.get(event, "service.serviceName") !== "guardduty") {
				return BbPromise.resolve(false);
			}

			const title = _.get(event, "title");
			const description = _.get(event, "description");
			const createdAt = new Date(_.get(event, "time"));
			const severity = _.get(event, "severity");

			const threatName = _.get(event, "service.additionalInfo.threatName");
			const threatListName = _.get(event, "service.additionalInfo.threatListName");
			const fields = [];


			fields.push({
				title: "Description",
				value: description,
				short: false
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

			if (actionType == "PORT_PROBE") {

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
			else {
				console.log(`Unknown GuardDuty actionType '${actionType}'`);

				fields.push({
					title: "Unknown Action Type",
					value: JSON.stringify(_.get(event, "service.action"), null, 2),
					short: false
				});
			}

			const resourceType = _.get(event, "resource.resourceType");

			fields.push({
				title: "Resource Type",
				value: resourceType,
				short: true
			});

			if (resourceType == "Instance") {

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
			else {
				console.log(`Unknown GuardDuty resourceType '${resourceType}'`);

				fields.push({
					title: "Unknown Resource Type ("+resourceType+")",
					value: JSON.stringify(_.get(event, "resource"), null, 2),
					short: false
				});
			}

			const color = Slack.COLORS.neutral;

			const slackMessage = {
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
			return BbPromise.resolve(slackMessage);
		});
	}
}

module.exports = GuardDutyParser;
