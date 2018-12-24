-- +migrate Up
CREATE TABLE IF NOT EXISTS %%PREFIX%%_tree (
    uuid   VARCHAR(128)      NOT NULL,
    level  SMALLINT          NOT NULL,

    hash   BIGINT            NOT NULL,
    mpath1 VARCHAR(255)      NOT NULL,
    mpath2 VARCHAR(255)      NOT NULL,
    mpath3 VARCHAR(255)      NOT NULL,
    mpath4 VARCHAR(255)      NOT NULL,

    rat    BLOB              NOT NULL,

    CONSTRAINT %%PREFIX%%_tree_pk PRIMARY KEY (uuid),
    CONSTRAINT %%PREFIX%%_tree_u1 UNIQUE (hash),

    INDEX %%PREFIX%%_tree_mpath1_idx (mpath1),
    INDEX %%PREFIX%%_tree_mpath2_idx (mpath2),
    INDEX %%PREFIX%%_tree_mpath3_idx (mpath3),
    INDEX %%PREFIX%%_tree_mpath4_idx (mpath4)
) CHARACTER SET ASCII;

CREATE TABLE IF NOT EXISTS %%PREFIX%%_nodes (
    uuid     VARCHAR(128) NOT NULL,
    name     VARCHAR(255) NOT NULL,
    leaf     TINYINT(1),
    mtime    INT NOT NULL,
    etag     VARCHAR(255),
    size     BIGINT,
    mode     VARCHAR(10),

    CONSTRAINT %%PREFIX%%_nodes_pk PRIMARY KEY (uuid)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

CREATE TABLE IF NOT EXISTS %%PREFIX%%_commits (
    id       BIGINT NOT NULL AUTO_INCREMENT,
    uuid     VARCHAR(128) NOT NULL,
    etag     VARCHAR(255) NOT NULL,
    mtime    INT NOT NULL,
    size     BIGINT,
    data     BLOB NULL,

    PRIMARY KEY (id),
    INDEX %%PREFIX%%_tree_uuid_idx (uuid)

) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;

-- +migrate Down
DROP TABLE %%PREFIX%%_tree;
DROP TABLE %%PREFIX%%_nodes;
DROP TABLE %%PREFIX%%_commits;