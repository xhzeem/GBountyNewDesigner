// Schema Definitions
const defaultProfile = {
  "profile_name": "New Profile",
  "enabled": true,
  "scanner": "active",
  "author": "",
  "steps": [
    {
      "request_type": "original",
      "insertion_point": "same",
      "raw_request": "",
      "payloads": [],
      "payload_position": "replace",
      "change_http_request": false,
      "change_http_request_type": "post_to_get",
      "insertion_points": [],
      "header_value": false,
      "new_headers": [],
      "match_replace": [],
      "encoder": [],
      "url_encode": true,
      "chars_to_url_encode": "&",
      "grep": [],
      "redir_type": "never",
      "max_redir": 5,
      "show_alert": "always",
      "issue_name": "New Issue",
      "issue_severity": "high",
      "issue_confidence": "certain",
      "issue_detail": "",
      "remediation_detail": "",
      "issue_background": "",
      "remediation_background": ""
    }
  ],
  "Tags": []
};

// Passive profile structure (no steps)
const defaultPassiveProfile = {
  "profile_name": "New Profile",
  "enabled": true,
  "scanner": "passive_request",
  "author": "",
  "grep": [],
  "issue_name": "New Issue",
  "issue_severity": "high",
  "issue_confidence": "certain",
  "issue_detail": "",
  "remediation_detail": "",
  "issue_background": "",
  "remediation_background": "",
  "Tags": []
};

// Helper function to get appropriate default based on scanner type
function getDefaultProfile(scannerType) {
  if (scannerType === 'active') {
    return JSON.parse(JSON.stringify(defaultProfile));
  } else {
    // passive_request or passive_response
    const profile = JSON.parse(JSON.stringify(defaultPassiveProfile));
    profile.scanner = scannerType;
    return profile;
  }
}

const scannerTypes = ["active", "passive_request", "passive_response"];
const severities = ["high", "medium", "low", "information"];
const confidences = ["certain", "firm", "tentative"];
const insertionPoints = {
  "Body": [
    "param_body",
    "param_name_body",
    "entire_body",
    "param_json",
    "param_name_json",
    "entire_body_json",
    "param_xml",
    "param_name_xml",
    "param_xml_attr",
    "param_name_xml_attr",
    "entire_body_xml",
    "param_multipart_attr",
    "param_name_multi_part_attr",
    "entire_body_multipart"
  ],
  "URL": [
    "param_url",
    "param_name_url",
    "url_path_filename",
    "url_path_folder",
  ],
  "Cookie": [
    "param_cookie",
    "param_name_cookie"
  ],
  "Headers": [
    "user_agent",
    "referer",
    "origin",
    "host",
    "content_type",
    "accept",
    "accept_language",
    "accept_encoding"
  ],
  "Others": [
    "user_provided",
    "single_path_discovery",
    "extension_provide"
  ]
};

const payloadPositions = ["replace", "append", "insert"];
const insertionPointModes = ["same", "any"];
const changeHttpMethods = ["post_to_get", "get_to_post", "get_post_get"];
const matchReplaceTypes = ["Payload", "Request"];
const matchReplaceRegexTypes = ["String", "Regex"];
const payloadEncoders = [
  "URL-encode key characters",
  "URL-encode all characters",
  "URL-encode all characters (Unicode)",
  "HTML-encode key characters",
  "HTML-encode all characters",
  "Base64-encode"
];
const showIssueOptions = ["always", "one", "none"];
const redirTypes = ["never", "on_site", "always"];

// Grep options for different scanner types
const grepOptionsForActiveRequest = [
  "",
  "Case Sensitive"
];

const grepOptionsForPassiveResponse = [
  "",
  "Case Sensitive",
  "Only in Headers",
  "Not in Headers"
];
