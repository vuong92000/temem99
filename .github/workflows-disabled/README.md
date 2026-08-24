# CI workflows (parked)

These are the upstream GitHub Actions workflows from `lcy362/agnes-video-generator`.

They live in `.github/workflows-disabled/` instead of `.github/workflows/` because the
automation account used to import this repository does not hold the `workflows`
permission, so GitHub refuses pushes that add files under `.github/workflows/`.

To enable CI, rename the directory back with your own credentials:

```bash
git mv .github/workflows-disabled .github/workflows
git rm .github/workflows/README.md
git commit -m "chore: enable CI workflows"
```
