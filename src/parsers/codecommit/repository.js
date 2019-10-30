//
// AWS CodeCommit: Repository change event
//
const AWS = require("aws-sdk");

exports.matches = event =>
	event.getSource() === "codecommit"
	&& _.get(event.message, "detail-type") === "CodeCommit Repository State Change";

exports.parse = async (event) => {
	const callerArn = event.get("detail.callerUserArn");
	const refName = event.get("detail.referenceName");
	const refType = event.get("detail.referenceType");
	const repoName = event.get("detail.repositoryName");
	const repoEvent = event.get("detail.event");
	const repoUrl = event.consoleUrl(`/codecommit/home#/repository/${repoName}`);
	const fields = [];

	const color = event.COLORS.neutral;
	let title = repoName;
	if (repoEvent === "referenceCreated" && refType === "branch") {
		title = `New branch created in repository ${repoName}`;
	}
	else if (repoEvent === "referenceUpdated" && refType === "branch") {
		title = `New commit pushed to repository ${repoName}`;
	}
	else if (repoEvent === "referenceDeleted" && refType === "branch") {
		title = `Deleted branch in repository ${repoName}`;
	}
	else if (repoEvent === "referenceCreated" && refType === "tag") {
		title = `New tag created in repository ${repoName}`;
	}
	else if (repoEvent === "referenceUpdated" && refType === "tag") {
		title = `Tag reference modified in repository ${repoName}`;
	}
	else if (repoEvent === "referenceDeleted" && refType === "tag") {
		title = `Deleted tag in repository ${repoName}`;
	}

	if (repoName) {
		fields.push({
			title: "Repository",
			value: repoName,
			short: true,
		});
	}

	if (refType) {
		fields.push({
			title: _.toUpper(refType.charAt(0)) + refType.slice(1),
			value: refName,
			short: true,
		});
	}

	if (callerArn) {
		fields.push({
			title: "Caller ARN",
			value: callerArn,
		});
	}

	const client = new AWS.CodeCommit({
		region: event.getRegion(),
		httpOptions: { timeout: 5, connectTimeout: 1 }
	});
	let commitId = _.get(event, "detail.commitId");
	if (!commitId && refType === "branch" && repoEvent === "referenceUpdated") {
		try {
			const res = await client.getBranch({
				repositoryName: repoName,
				branchName: refName
			}).promise();
			commitId = res.branch.commitId;
		}
		catch (err) {
			console.error("repository.js: Failed to inspect branch:", err);
			fields.push({
				title: "Commit Message",
				value: "Could not inspect repository. Check logs for stack trace.",
			});
		}
	}
	if (commitId) {
		try {
			const res = await client.getCommit({
				repositoryName: repoName,
				commitId: commitId,
			}).promise();
			fields.push({
				title: "Commit Message",
				value: res.commit.message,
			});
		}
		catch (err) {
			console.error("repository.js: Failed to retrieve CodeCommit message:", err);
			fields.push({
				title: "Commit Message",
				value: "Could not get message. Check logs for stack trace.",
			});
		}
	}

	return event.attachmentWithDefaults({
		author_name: "AWS CodeCommit",
		fallback: `${repoName}: ${title}`,
		color: color,
		title: title,
		title_link: repoUrl,
		fields: fields,
		mrkdwn_in: ["title", "text"],
	});
};
