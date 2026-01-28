# Auditing Manager

A [Power Platform Toolbox](https://www.powerplatformtoolbox.com/) tool for viewing Dataverse audit logs and managing audit settings in one place.

## Features

🔍 **Audit Log Viewer**
  - View different audit detail types (Data Changes, User Access, Record Shares, Security Role Changes, and Metadata Changes)
  - Sort and filter logs by date range, table, date range, user, and action type
  - View audit change details (old vs new)
  - Export to CSV with optional change details
  - View full change history for a record **(coming soon)**

⚙️ **Global Audit Settings**
  - View and edit organization-level audit settings

🗃️ **Table Audit Settings**
  - View and manage table-level audit settings
  - View attribute-level audit settings
  - Export to CSV table and attribute-level settings
  - Modify table-level audit settings **(coming soon)**
  - Modify attribute-level audit settings **(coming soon)**

## Usage

### Dataverse Permissions

- **View Audit Logs** - Requires the *View Audit History* privilege (prvReadAuditHistory)
- **Modify Global Audit Settings** - Requires *System Administrator* or *System Customizer* security role

## Technology Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS

## License

GPL-3.0
