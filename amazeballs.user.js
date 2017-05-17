// ==UserScript==
// @name        Amazeballs
// @namespace   https://*.atlassian.net
// @description Make Jira Great Again.
// @include     https://*.atlassian.net/*
// @version     1
// @grant       none
// @updateURL    https://gist.github.com/kunday/b94c9a6e0711ec850e9e0d0a95ae018f/raw/amazeball.meta.js
// @downloadURL  https://gist.github.com/kunday/b94c9a6e0711ec850e9e0d0a95ae018f/raw/amazeballs.user.js
// ==/UserScript==

// TODO: Rewrite the details panel
// TODO: Split Acceptance Criteria and add a checklist
// TODO: Toggle to Show and Hide the Sidebar.


const HTTPGet = function (url) {
  const xmlHttp = new XMLHttpRequest();
  xmlHttp.open('GET', url, false); // false for synchronous request
  xmlHttp.send(null);
  return JSON.parse(xmlHttp.responseText);
};

const JiraApiIssueUrl = function (issueId) {
  return `https://zendesk.atlassian.net/rest/api/2/issue/${issueId}?expand=changelog`;
};

const JiraApiIssue = function (issueId) {
  return new HTTPGet(JiraApiIssueUrl(issueId));
};

const CurrentJiraIssue = function () {
  const issueId = document.head.querySelector('[name=ajs-issue-key]').content;

  return JiraApiIssue(issueId);
};

const UserAvatar = function (user) {
  return `
  <span class="aui-avatar aui-avatar-large">
    <span class="aui-avatar-inner">
      <img src="${user.avatarUrls['48x48']}" />
    </span>
  </span>`;
};

const IssueMembers = function (issue) {
  const uniqueAuthors = {};

  for (const i in issue.changelog.histories) {
    const history = issue.changelog.histories[i];
    uniqueAuthors[history.author.key] = history.author;
  }

  return uniqueAuthors;
};

const IssueMembersPanel = function (issue) {
  let html = '';
  const members = IssueMembers(issue);
  for (const i in members) {
    html += UserAvatar(members[i]);
  }

  return html;
};

const LabelsPanel = function (issue) {
  let html = '';
  for (const i in issue.fields.labels) {
    html += `<span class="aui-lozenge aui-lozenge-current" style="text:alight-right; padding:10px; margin-left: 10px">
      ${issue.fields.labels[i]}
    </span>`;
  }

  return html;
};

const IssueGutter = function (issue) {
  let epicHtml = '';
  if (issue.fields.customfield_11400) {
    const epic = JiraApiIssue(issue.fields.customfield_11400);
    epicHtml = `<a href="${epic.key}">
        ${epic.key} - ${epic.fields.summary}
      </a>`;
  } else {
    epicHtml = 'No Epic';
  }
  this.html = `
  <div class="aui-page-panel" style="background: lemonchiffon">
    <div class="aui-page-panel-inner">
      <section class="aui-page-panel-content">
        <table>
          <thead>
            <tr>
              <th style="text-align: left;color: black; padding-left: 10px">Type</th>
              <th style="text-align: left;color: black; padding-left: 10px">Status</th>
              <th style="text-align: left;color: black; padding-left: 10px">Members</th>
              <th style="text-align: left;color: black; padding-left: 20px">Labels</th>
              <th style="text-align: left;color: black; padding-left: 20px">Epic</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 10px;">
                <img src=${issue.fields.issuetype.iconUrl} />
                ${issue.fields.issuetype.name}
              </td>
              <td style="padding: 10px;">
                <span class="aui-lozenge aui-lozenge-complete">
                  ${issue.fields.status.name}
                </span>
              </td>
              <td style="padding: 10px;">
                ${IssueMembersPanel(issue)}
              </td>
              <td style="padding: 10px;">
                ${LabelsPanel(issue)}
              </td>
              <td style="padding: 20px;">
                ${epicHtml}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
  `;
};

const issue = CurrentJiraIssue();
const issueGutter = new IssueGutter(issue);

const header = document.getElementById('stalker');
const div = document.createElement('div');
div.innerHTML = issueGutter.html;
header.appendChild(div);


const Button = function (name) {
  this.html = `
  <ul class="toolbar-group pluggable-ops">
    <li class="toolbar-item toolbar-analytics">
      <span class="trigger-label aui-button">${name}</span>
    </li>
  </ul>`;
};

const Panel = function (name, divId) {
  this.divId = divId;
  this.name = name;
  this.div = document.getElementById(this.divId);
  this.divContent = this.div.innerHTML;
  this.remove = function () {
    this.div.parentNode.removeChild(this.div);
  };
  this.hide = function () {
    this.div.style.display = 'none';
  };
  this.show = function () {
    this.div.style.display = null;
  };
  this.addButton = function () {
    // TODO: Make click handlers work
    const button = new Button(name);
    const div = document.createElement('ul');
    div.innerHTML = button.html;
    div.class = '.toolbar-group.pluggable-ops';
    const toolBarElement = document.querySelectorAll('div.toolbar-split-left');
    toolBarElement[0].append(div);
  };
};

const PanelsConfig = {
  Invision: 'com.invisionapp.integration.jira__invision-webpanel',
  Gliphy: 'com.gliffy.integration.jira__gliffy-jira-diagram-panel',
  ZendeskSupport: 'zendesk_for_jira__issue-panel',
  SmartCheckList: 'rw-smart-checklists__rw-checklist-issue-panel',
  Watchers: 'whoslooking-connect__whos-looking',
  Agile: 'greenhopper-agile-issue-web-panel',
  Dates: 'datesmodule',
  People: 'peoplemodule',
  DetailsModule: 'details-module',
};

const hideAllPanels = function () {
  for (const panelName in PanelsConfig) {
    const panel = new Panel(panelName, PanelsConfig[panelName]);
    panel.hide();
  }
};

const insertDetailsOnRightPanel = function () {
  const sideBar = document.getElementById('viewissuesidebar');
  const detailsModule = new Panel('DetailsModule', PanelsConfig.DetailsModule);
  const div = document.createElement('div');
  div.innerHTML = detailsModule.divContent;
  sideBar.append(div);
};

const maximizeIssueBody = function () {
  const sideBar = document.getElementById('viewissuesidebar');
  sideBar.parentNode.classList.remove('aui-group');
};

hideAllPanels();
maximizeIssueBody();
