# fakeCommits.ps1
# Run this in your local git repo

# Array of realistic commit messages
$messages = @(
    "Setup project structure",
    "Add README sections",
    "Implement basic functions",
    "Fix typos in README",
    "Add placeholder config files",
    "Refactor main function",
    "Improve variable naming",
    "Add comments for clarity",
    "Add TODOs for future features",
    "Fix minor bugs",
    "Update documentation",
    "Add sample data",
    "Optimize code logic",
    "Add error handling",
    "Remove unused imports",
    "Update dependencies",
    "Improve formatting",
    "Add logging",
    "Enhance performance",
    "Fix edge case bugs",
    "Update README badges",
    "Add unit tests",
    "Refactor utils",
    "Improve UI layout",
    "Fix function signatures",
    "Update examples",
    "Clean up code",
    "Add placeholder images",
    "Adjust config settings",
    "Update comments",
    "Fix spelling mistakes",
    "Add script for automation",
    "Improve algorithm efficiency",
    "Update changelog",
    "Add sample outputs",
    "Refactor components",
    "Improve variable scope",
    "Update installation instructions",
    "Fix deprecated warnings",
    "Add contributor info",
    "Update .gitignore",
    "Clean temp files",
    "Minor code tweaks",
    "Add extra checks",
    "Improve readability"
)

# Function to get random date in the past 30 days
function Get-RandomDate {
    $daysAgo = Get-Random -Minimum 0 -Maximum 30
    $hours = Get-Random -Minimum 0 -Maximum 23
    $minutes = Get-Random -Minimum 0 -Maximum 59
    (Get-Date).AddDays(-$daysAgo).AddHours(-$hours).AddMinutes(-$minutes)
}

# Generate 45 commits
for ($i = 0; $i -lt 45; $i++) {
    $index = Get-Random -Minimum 0 -Maximum $messages.Count
    $msg = $messages[$index]
    $date = Get-RandomDate
    $dateString = $date.ToString("yyyy-MM-dd HH:mm:ss")

    Write-Host "Committing: $msg at $dateString"

    # Create empty commit with custom date
    git commit --allow-empty -m "$msg" --date="$dateString"
}


Write-Host "Done! 45 fake commits added."
