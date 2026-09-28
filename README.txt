Give-Directly website

RUN (needs Node.js 18+):
  ADMIN_PASSWORD="choose-a-long-password" node server.js
  (Windows PowerShell:  $env:ADMIN_PASSWORD="choose-a-long-password"; node server.js)

  Site:   http://localhost:3000
  Admin:  http://localhost:3000/admin.html

Visitors can only READ the Stories page. Posts are created, edited and deleted
in the admin panel, and stored in data/stories.json. Uploaded photos go to
assets/images/stories/.

If ADMIN_PASSWORD is not set, a random password is printed in the terminal.
Opening the HTML files directly from a folder (without the server) shows the
public pages only; the admin panel needs the server.
