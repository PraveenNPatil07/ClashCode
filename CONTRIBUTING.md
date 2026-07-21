# Contributing to ClashCode

First off, thank you for considering contributing to ClashCode! It's people like you that make ClashCode such a great tool for students.

## Where do I go from here?

If you've noticed a bug or have a feature request, make one! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

If you have a general question about ClashCode, you can post it on Stack Overflow or our Discussions page.

## Fork & create a branch

If this is something you think you can fix, then fork ClashCode and create a branch with a descriptive name.

A good branch name would be (where issue #325 is the ticket you're working on):

```bash
git checkout -b 325-add-cpp-support
```

## Get the test suite running

Make sure you have read the [TESTING.md](TESTING.md) guide and that you can run both unit and e2e tests successfully on your machine.

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help if you get stuck.

## Make a Pull Request

At this point, you should switch back to your master branch and make sure it's up to date with ClashCode's master branch:

```bash
git remote add upstream git@github.com:your-username/clashcode.git
git checkout main
git pull upstream main
```

Then update your feature branch from your local copy of master, and push it!

```bash
git checkout 325-add-cpp-support
git rebase main
git push --set-upstream origin 325-add-cpp-support
```

Finally, go to GitHub and make a Pull Request! We've provided a PR template that will automatically populate your description. Please fill it out as completely as possible.

## Keeping your Pull Request updated

If a maintainer asks you to "rebase" your PR, they're saying that a lot of code has changed, and that you need to update your branch so it's easier to merge.

## Code of Conduct

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.
