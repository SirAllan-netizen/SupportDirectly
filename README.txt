Give-Directly website — PHP/XAMPP edition

LOCAL DEVELOPMENT WITH XAMPP
----------------------------
This edition does not require Node.js or npm.

1. Put the project in:
   C:\\xampp\\htdocs\\SupportDirectly\\

2. Open XAMPP Control Panel and start Apache.

3. First-time admin setup:
   http://localhost/SupportDirectly/setup-admin.php

4. Blog admin:
   http://localhost/SupportDirectly/admin.html

5. Public site:
   http://localhost/SupportDirectly/

BLOG STORAGE
------------
Posts: data/stories.json
Uploaded images: assets/images/stories/
Admin password hash: data/admin-config.php

The password is stored as a secure PHP password hash, not readable plain text.
The data folder includes an .htaccess rule blocking direct web access.

BLOG ADMIN FEATURES
-------------------
- Draft and published posts
- Future publication dates (scheduled posts)
- Title, excerpt, author, category and location
- Featured JPG/PNG/WebP images up to 5 MB
- Full article body
- Preview before saving
- Search/filter
- Edit and delete

HOSTINGER
---------
This PHP version is designed to move cleanly to normal PHP hosting such as Hostinger.
PHP must be enabled, and PHP needs write permission to data/ and assets/images/stories/.
Run setup-admin.php once on the live server to create the production admin password.
