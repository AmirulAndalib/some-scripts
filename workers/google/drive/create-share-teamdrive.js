
                  </label>
                  <input
                    type="email"
                   ogle/drive/create-share-teamdrive.js"
        >
        

        try {
          let result = await gd.createAndShareTeamDrive(requestBody);
          return new Response("OK", {
            status: 200
          });
        } catch (err) {
          return new Response(err.toString(), {
            status: 500
          });
        }
      } else if (request.method === "OPTIONS") {
        return new Response("", {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": "*"
          }
        });
      } else {
        return new Response("Bad Request", {
          status: 400
        });
      }
    default:
      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Access-Control-Allow-Origin": "*"
        }
      });
  }
}
// https://stackoverflow.com/a/2117523
function uuidv4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    // tslint:disable-next-line:one-variable-per-declaration
    const r = (Math.random() * 16) | 0,
      // tslint:disable-next-line:triple-equals
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class googleDrive {
  constructor(authConfig) {
    this.authConfig = authConfig;
    this.accessToken();
  }

  async getTeamDriveThemes() {
    let url = "https://www.googleapis.com/drive/v3/about";
    let requestOption = await this.requestOption();
    let params = { fields: "teamDriveThemes" };
    url += "?" + this.enQuery(params);
    let response = await fetch(url, requestOption);
    return await response.json();
  }

  async createAndShareTeamDrive(requestBody) {
    // Create team drive
    console.log("Creating TeamDrive");
    let url = "https://www.googleapis.com/drive/v3/drives";
    let requestOption = await this.requestOption(
      { "Content-Type": "application/json" },
      "POST"
    );
    let params = { requestId: uuidv4() };
    url += "?" + this.enQuery(params);
    let post_data = {
      name: requestBody.teamDriveName
    };
    if (
      requestBody.teamDriveThemeId &&
      requestBody.teamDriveThemeId !== "random"
    ) {
      post_data.themeId = requestBody.teamDriveThemeId;
    }
    requestOption.body = JSON.stringify(post_data);
    let response = await fetch(url, requestOption);
    let result = await response.json();
    const teamDriveId = result.id;
    console.log("Created TeamDrive ID", teamDriveId);

    // Get created drive user permission ID
    console.log(`Getting creator permission ID`);
    url = `https://www.googleapis.com/drive/v3/files/${teamDriveId}/permissions`;
    params = { supportsAllDrives: true };
    params.fields = "permissions(id,emailAddress)";
    url += "?" + this.enQuery(params);
    requestOption = await this.requestOption();
    response = await fetch(url, requestOption);
    result = await response.json();
    const currentUserPermissionID = result.permissions[0].id;
    console.log(currentUserPermissionID);

    // Share team drive with email address
    console.log(`Sharing the team drive to ${requestBody.emailAddress}`);
    url = `https://www.googleapis.com/drive/v3/files/${teamDriveId}/permissions`;
    params = { supportsAllDrives: true };
    url += "?" + this.enQuery(params);
    requestOption = await this.requestOption(
      { "Content-Type": "application/json" },
      "POST"
    );
    post_data = {
      role: "organizer",
      type: "user",
      emailAddress: requestBody.emailAddress
    };
    requestOption.body = JSON.stringify(post_data);
    response = await fetch(url, requestOption);
    await response.json();

    // Delete creator from the team drive
    console.log("Deleting creator from the team drive");
    url = `https://www.googleapis.com/drive/v3/files/${teamDriveId}/permissions/${currentUserPermissionID}`;
    params = { supportsAllDrives: true };
    url += "?" + this.enQuery(params);
    requestOption = await this.requestOption({}, "DELETE");
    response = await fetch(url, requestOption);
    return await response.text();
  }

  async accessToken() {
    console.log("accessToken");
    if (
      this.authConfig.expires == undefined ||
      this.authConfig.expires < Date.now()
    ) {
      const obj = await this.fetchAccessToken();
      if (obj.access_token != undefined) {
        this.authConfig.accessToken = obj.access_token;
        this.authConfig.expires = Date.now() + 3500 * 1000;
      }
    }
    return this.authConfig.accessToken;
  }

  async fetchAccessToken() {
    console.log("fetchAccessToken");
    const url = "https://www.googleapis.com/oauth2/v4/token";
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded"
    };
    const post_data = {
      client_id: this.authConfig.client_id,
      client_secret: this.authConfig.client_secret,
      refresh_token: this.authConfig.refresh_token,
      grant_type: "refresh_token"
    };

    let requestOption = {
      method: "POST",
      headers: headers,
      body: this.enQuery(post_data)
    };

    const response = await fetch(url, requestOption);
    return await response.json();
  }

  async requestOption(headers = {}, method = "GET") {
    const accessToken = await this.accessToken();
    headers["authorization"] = "Bearer " + accessToken;
    return { method: method, headers: headers };
  }

  enQuery(data) {
    const ret = [];
    for (let d in data) {
      ret.push(encodeURIComponent(d) + "=" + encodeURIComponent(data[d]));
    }
    return ret.join("&");
  }
}
