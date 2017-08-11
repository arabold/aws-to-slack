AWS_CLI?=/usr/local/bin/aws
TEMP_PATH=.temp
RELEASE_ZIP=build/release.zip

.PHONY: deps
deps:
	npm install

.PHONY: package
package:
	# Prepare
	-@rm -r "$(TEMP_PATH)" 2>/dev/null || true
	-@rm "$(RELEASE_ZIP)" 2>/dev/null || true
	@mkdir -p "$(TEMP_PATH)"

	# Copy sources to temporary folder
	@cp -R src package-lock.json package.json "$(TEMP_PATH)/"

	# Install dependencies
	@cd "$(TEMP_PATH)" && npm install --production

	# Package artifact
	@cd "$(TEMP_PATH)" && zip -r "../$(RELEASE_ZIP)" .

	# Cleanup
	@rm -r "$(TEMP_PATH)"

.PHONY: publish
publish:
	@"$(AWS_CLI)" s3 cp "./cloudformation.yaml" "s3://aws-to-slack/"
	@"$(AWS_CLI)" s3 cp "$(RELEASE_ZIP)" "s3://aws-to-slack/"
