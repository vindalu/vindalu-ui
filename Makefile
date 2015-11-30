NAME = vindalu-ui
VERSION = 0.2.12
DESCRIPTION = Vindalu web UI
URL = https://github.com/vindalu/vindalu-ui

EPOCH = $(shell date +%s)

BUILD_DIR = ./build
APP_HOME = ${BUILD_DIR}/opt/${NAME}
DEST_DIR = ${APP_HOME}/ui

.clean:
	rm -rf ${BUILD_DIR}

.build: .clean
	[ -d "${DEST_DIR}" ] || mkdir -p ${DEST_DIR}

	cp -a app ${DEST_DIR}
	cp -a css ${DEST_DIR}
	cp -a imgs ${DEST_DIR}
	cp -a libs ${DEST_DIR}
	cp index.html ${DEST_DIR}

.deb:
	find ./build -name '.DS_Store' -exec rm -vf '{}' \; 
	cd ${BUILD_DIR} && \
	fpm -s dir -t deb --log error -n ${NAME} --epoch ${EPOCH} --version ${VERSION} --description "${DESCRIPTION}" \
		--license MIT --url "${URL}" ./opt

.rpm:
	find ./build -name '.DS_Store' -exec rm -vf '{}' \;
	cd ${BUILD_DIR} && \
	fpm -s dir -t rpm --log error -n ${NAME} --epoch ${EPOCH} --version ${VERSION} --description "${DESCRIPTION}" \
		--license MIT --url "${URL}" ./opt

.packages: .deb .rpm

all: .build
