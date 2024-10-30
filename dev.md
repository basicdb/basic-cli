release notes: 

update version in package.json

update version in main.go

commit bump

update github tag - match with version in package.json

command: git tag -a v0.0.4 -m "release 0.0.4"

run goreleaser release --clean to create a new release and publish to github

publish to npm