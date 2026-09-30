$ErrorActionPreference = 'Stop'
$subscription = '86d9e5e6-b9bf-44b4-915a-106207e0bc02'
if ($env:AZURE_SUBSCRIPTION_ID -ne $subscription -or $env:AZURE_SWA_LOGIN_VALIDATED -ne 'true') {
    throw 'SWA deployment requires the approved Students subscription and prior browser login/domain validation.'
}
$account = & az rest --method get --url "https://management.azure.com/subscriptions/$subscription`?api-version=2022-12-01" --subscription $subscription --output json --only-show-errors | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $account.subscriptionPolicies.quotaId -notlike 'AzureForStudents_*' -or
    $account.subscriptionPolicies.spendingLimit -ne 'On' -or $account.state -ne 'Enabled') { throw 'Invalid Students subscription.' }
& az staticwebapp show --resource-group rg-hs-thesis-azure --name hs-thesis-front --subscription $subscription --output none --only-show-errors
if ($LASTEXITCODE -ne 0) { throw 'SWA is not in the approved Students resource group.' }
$expectedToken = & az staticwebapp secrets list --resource-group rg-hs-thesis-azure --name hs-thesis-front --subscription $subscription --query properties.apiKey --output tsv --only-show-errors
if ($LASTEXITCODE -ne 0 -or !$expectedToken -or !$env:AZURE_STATIC_WEB_APPS_API_TOKEN) { throw 'Cannot verify the SWA deployment token against the Students target.' }
if ($env:GITHUB_ACTIONS -eq 'true') { Write-Host "::add-mask::$expectedToken" }
$expectedDigest = [System.Security.Cryptography.SHA256]::HashData([System.Text.Encoding]::UTF8.GetBytes($expectedToken))
$providedDigest = [System.Security.Cryptography.SHA256]::HashData([System.Text.Encoding]::UTF8.GetBytes($env:AZURE_STATIC_WEB_APPS_API_TOKEN))
$difference = 0
for ($index = 0; $index -lt 32; $index++) { $difference = $difference -bor ($expectedDigest[$index] -bxor $providedDigest[$index]) }
if ($difference -ne 0) {
    throw 'The SWA token does not belong to the verified Students resource. Deployment is refused.'
}
$expectedToken = $null
